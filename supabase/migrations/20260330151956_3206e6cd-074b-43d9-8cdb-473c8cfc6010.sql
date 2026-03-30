
-- =====================================================
-- 1. BIO_COIN_TRANSACTIONS: Remove direct INSERT, add server-side RPC
-- =====================================================
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.bio_coin_transactions;

-- Create a validated RPC for bio-coin transactions
CREATE OR REPLACE FUNCTION public.add_bio_coin_transaction(
  _type text,
  _amount integer,
  _description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _valid_types text[] := ARRAY['workout_complete', 'checkin', 'badge_reward', 'challenge_win', 'challenge_loss', 'purchase', 'store_purchase'];
  _new_id uuid;
BEGIN
  -- Validate type
  IF NOT (_type = ANY(_valid_types)) THEN
    RAISE EXCEPTION 'Invalid transaction type: %', _type;
  END IF;

  -- Validate amount based on type
  IF _type IN ('workout_complete', 'checkin', 'badge_reward', 'challenge_win') AND _amount <= 0 THEN
    RAISE EXCEPTION 'Award amount must be positive';
  END IF;
  IF _type IN ('purchase', 'store_purchase', 'challenge_loss') AND _amount >= 0 THEN
    RAISE EXCEPTION 'Debit amount must be negative';
  END IF;

  -- Cap single transaction amount
  IF ABS(_amount) > 1000 THEN
    RAISE EXCEPTION 'Transaction amount exceeds maximum allowed';
  END IF;

  INSERT INTO public.bio_coin_transactions (user_id, type, amount, description)
  VALUES (auth.uid(), _type, _amount, _description)
  RETURNING id INTO _new_id;

  -- Update profile balance
  UPDATE public.profiles
  SET bio_coins = GREATEST(COALESCE(bio_coins, 0) + _amount, 0)
  WHERE id = auth.uid();

  RETURN _new_id;
END;
$$;

-- =====================================================
-- 2. CHALLENGES: Restrict UPDATE to proof fields only via trigger
-- =====================================================
DROP POLICY IF EXISTS "Users can update their challenges" ON public.challenges;

-- Allow participants to only update their own proof fields
CREATE POLICY "Challengers can submit proof"
ON public.challenges FOR UPDATE TO authenticated
USING (auth.uid() = challenger_id)
WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Opponents can submit proof"
ON public.challenges FOR UPDATE TO authenticated
USING (auth.uid() = opponent_id)
WITH CHECK (auth.uid() = opponent_id);

-- Trigger to prevent participants from setting winner_id or inflating wager
CREATE OR REPLACE FUNCTION public.validate_challenge_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent changing wager after creation
  IF NEW.wager_coins IS DISTINCT FROM OLD.wager_coins THEN
    RAISE EXCEPTION 'Cannot modify wager after challenge creation';
  END IF;

  -- Prevent participants from directly setting winner_id
  IF NEW.winner_id IS DISTINCT FROM OLD.winner_id THEN
    RAISE EXCEPTION 'winner_id can only be set by the resolve_dispute function';
  END IF;

  -- Prevent direct status change to 'completed' (must go through resolve_dispute)
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    RAISE EXCEPTION 'Cannot directly complete a challenge; use dispute resolution';
  END IF;

  -- Challengers can only update their own proof fields
  IF auth.uid() = OLD.challenger_id THEN
    IF NEW.opponent_proof_url IS DISTINCT FROM OLD.opponent_proof_url THEN
      RAISE EXCEPTION 'Cannot modify opponent proof';
    END IF;
    IF NEW.opponent_value IS DISTINCT FROM OLD.opponent_value THEN
      RAISE EXCEPTION 'Cannot modify opponent value';
    END IF;
  END IF;

  -- Opponents can only update their own proof fields
  IF auth.uid() = OLD.opponent_id THEN
    IF NEW.proof_url IS DISTINCT FROM OLD.proof_url THEN
      RAISE EXCEPTION 'Cannot modify challenger proof';
    END IF;
    IF NEW.challenger_value IS DISTINCT FROM OLD.challenger_value THEN
      RAISE EXCEPTION 'Cannot modify challenger value';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_challenge_update
BEFORE UPDATE ON public.challenges
FOR EACH ROW
EXECUTE FUNCTION public.validate_challenge_update();

-- =====================================================
-- 3. ACADEMY STORAGE: Restrict uploads to coaches/team members
-- =====================================================
DROP POLICY IF EXISTS "Coaches upload academy thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Coaches upload academy videos" ON storage.objects;

CREATE POLICY "Coaches upload academy thumbnails"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'academy-thumbnails'
  AND has_role(auth.uid(), 'coach'::app_role)
);

CREATE POLICY "Coaches upload academy videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'academy-videos'
  AND has_role(auth.uid(), 'coach'::app_role)
);

-- Also allow team members to upload academy content
CREATE POLICY "Team members upload academy thumbnails"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'academy-thumbnails'
  AND EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Team members upload academy videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'academy-videos'
  AND EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- =====================================================
-- 4. CHECKIN_EDIT_LOGS: Restrict to SELECT+INSERT only for athletes
-- =====================================================
DROP POLICY IF EXISTS "Users manage own edit logs" ON public.checkin_edit_logs;

CREATE POLICY "Users can view own edit logs"
ON public.checkin_edit_logs FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own edit logs"
ON public.checkin_edit_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 5. PROFILES: Prevent athletes from self-assigning coach_id
-- =====================================================
CREATE OR REPLACE FUNCTION public.validate_profile_coach_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If coach_id is being changed and the user is an athlete
  IF NEW.coach_id IS DISTINCT FROM OLD.coach_id THEN
    -- Only allow if the caller is a coach or if it's a server-side operation
    IF OLD.role = 'athlete' AND auth.uid() = OLD.id THEN
      RAISE EXCEPTION 'Athletes cannot change their own coach assignment';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_profile_coach_id
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_profile_coach_id();

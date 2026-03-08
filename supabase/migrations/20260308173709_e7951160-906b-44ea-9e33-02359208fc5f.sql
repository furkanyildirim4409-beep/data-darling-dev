
-- Coach invites table
CREATE TABLE public.coach_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz
);

ALTER TABLE public.coach_invites ENABLE ROW LEVEL SECURITY;

-- Coaches can manage their own invites
CREATE POLICY "Coaches can view own invites"
  ON public.coach_invites FOR SELECT
  USING (coach_id = auth.uid());

CREATE POLICY "Coaches can create invites"
  ON public.coach_invites FOR INSERT
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches can delete own invites"
  ON public.coach_invites FOR DELETE
  USING (coach_id = auth.uid());

-- RPC to claim an invite token (called after registration)
CREATE OR REPLACE FUNCTION public.claim_invite(_token text, _athlete_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite record;
BEGIN
  SELECT * INTO _invite FROM public.coach_invites
  WHERE token = _token AND used_by IS NULL AND expires_at > now();

  IF _invite IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  UPDATE public.profiles SET coach_id = _invite.coach_id WHERE id = _athlete_id;
  UPDATE public.coach_invites SET used_by = _athlete_id, used_at = now() WHERE id = _invite.id;

  RETURN jsonb_build_object('status', 'ok', 'coach_id', _invite.coach_id);
END;
$$;

-- Update handle_new_user to check for invite_token in metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite_token text;
  _invite record;
BEGIN
  _invite_token := NEW.raw_user_meta_data->>'invite_token';

  INSERT INTO public.profiles (id, full_name, avatar_url, role, email, coach_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'athlete'),
    NEW.email,
    NULL
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'athlete'));

  -- If invite token provided, claim it
  IF _invite_token IS NOT NULL AND _invite_token != '' THEN
    SELECT * INTO _invite FROM public.coach_invites
    WHERE token = _invite_token AND used_by IS NULL AND expires_at > now();

    IF _invite IS NOT NULL THEN
      UPDATE public.profiles SET coach_id = _invite.coach_id WHERE id = NEW.id;
      UPDATE public.coach_invites SET used_by = NEW.id, used_at = now() WHERE id = _invite.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

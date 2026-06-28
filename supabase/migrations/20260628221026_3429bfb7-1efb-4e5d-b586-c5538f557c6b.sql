-- ============================================================================
-- 1) profile_secrets: owner-only table for sensitive billing/PII
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profile_secrets (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  iban text,
  phone_number text,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.profile_secrets FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.profile_secrets TO authenticated;
GRANT ALL ON public.profile_secrets TO service_role;

ALTER TABLE public.profile_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner reads own secrets" ON public.profile_secrets;
CREATE POLICY "Owner reads own secrets"
  ON public.profile_secrets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owner inserts own secrets" ON public.profile_secrets;
CREATE POLICY "Owner inserts own secrets"
  ON public.profile_secrets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Owner updates own secrets" ON public.profile_secrets;
CREATE POLICY "Owner updates own secrets"
  ON public.profile_secrets
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS profile_secrets_stripe_customer_idx
  ON public.profile_secrets (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS profile_secrets_stripe_subscription_idx
  ON public.profile_secrets (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.profile_secrets_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profile_secrets_touch ON public.profile_secrets;
CREATE TRIGGER profile_secrets_touch
  BEFORE UPDATE ON public.profile_secrets
  FOR EACH ROW EXECUTE FUNCTION public.profile_secrets_set_updated_at();

-- Backfill from profiles (idempotent)
INSERT INTO public.profile_secrets (
  user_id, iban, phone_number, stripe_customer_id, stripe_subscription_id
)
SELECT id, iban, phone_number, stripe_customer_id, stripe_subscription_id
  FROM public.profiles
 WHERE iban IS NOT NULL
    OR phone_number IS NOT NULL
    OR stripe_customer_id IS NOT NULL
    OR stripe_subscription_id IS NOT NULL
ON CONFLICT (user_id) DO UPDATE
  SET iban                  = EXCLUDED.iban,
      phone_number          = EXCLUDED.phone_number,
      stripe_customer_id    = EXCLUDED.stripe_customer_id,
      stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      updated_at            = now();

-- Recreate existing UPDATE policies without the columns we are about to drop.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND NOT (role IS DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (email IS DISTINCT FROM (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (xp IS DISTINCT FROM (SELECT p.xp FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (bio_coins IS DISTINCT FROM (SELECT p.bio_coins FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (level IS DISTINCT FROM (SELECT p.level FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (subscription_tier IS DISTINCT FROM (SELECT p.subscription_tier FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (subscription_status IS DISTINCT FROM (SELECT p.subscription_status FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (coach_id IS DISTINCT FROM (SELECT p.coach_id FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (subscription_current_period_end IS DISTINCT FROM (SELECT p.subscription_current_period_end FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (subscription_cancel_at_period_end IS DISTINCT FROM (SELECT p.subscription_cancel_at_period_end FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (freeze_until IS DISTINCT FROM (SELECT p.freeze_until FROM public.profiles p WHERE p.id = auth.uid()))
  );

DROP POLICY IF EXISTS "Coaches can update athlete profiles" ON public.profiles;
CREATE POLICY "Coaches can update athlete profiles"
  ON public.profiles
  FOR UPDATE TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (
    coach_id = auth.uid()
    AND NOT (subscription_tier IS DISTINCT FROM (SELECT p.subscription_tier FROM public.profiles p WHERE p.id = public.profiles.id))
    AND NOT (subscription_status IS DISTINCT FROM (SELECT p.subscription_status FROM public.profiles p WHERE p.id = public.profiles.id))
    AND NOT (subscription_current_period_end IS DISTINCT FROM (SELECT p.subscription_current_period_end FROM public.profiles p WHERE p.id = public.profiles.id))
    AND NOT (subscription_cancel_at_period_end IS DISTINCT FROM (SELECT p.subscription_cancel_at_period_end FROM public.profiles p WHERE p.id = public.profiles.id))
    AND NOT (freeze_until IS DISTINCT FROM (SELECT p.freeze_until FROM public.profiles p WHERE p.id = public.profiles.id))
    AND NOT (role IS DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = public.profiles.id))
    AND NOT (email IS DISTINCT FROM (SELECT p.email FROM public.profiles p WHERE p.id = public.profiles.id))
  );

DROP POLICY IF EXISTS "Team members can update athlete profiles" ON public.profiles;
CREATE POLICY "Team members can update athlete profiles"
  ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_active_team_member_of(coach_id))
  WITH CHECK (
    public.is_active_team_member_of(coach_id)
    AND NOT (subscription_tier IS DISTINCT FROM (SELECT p.subscription_tier FROM public.profiles p WHERE p.id = public.profiles.id))
    AND NOT (subscription_status IS DISTINCT FROM (SELECT p.subscription_status FROM public.profiles p WHERE p.id = public.profiles.id))
    AND NOT (subscription_current_period_end IS DISTINCT FROM (SELECT p.subscription_current_period_end FROM public.profiles p WHERE p.id = public.profiles.id))
    AND NOT (subscription_cancel_at_period_end IS DISTINCT FROM (SELECT p.subscription_cancel_at_period_end FROM public.profiles p WHERE p.id = public.profiles.id))
    AND NOT (freeze_until IS DISTINCT FROM (SELECT p.freeze_until FROM public.profiles p WHERE p.id = public.profiles.id))
    AND NOT (coach_id IS DISTINCT FROM (SELECT p.coach_id FROM public.profiles p WHERE p.id = public.profiles.id))
    AND NOT (role IS DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = public.profiles.id))
    AND NOT (email IS DISTINCT FROM (SELECT p.email FROM public.profiles p WHERE p.id = public.profiles.id))
  );

-- Now safe to drop the leaked columns from profiles
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS iban,
  DROP COLUMN IF EXISTS phone_number,
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id;

-- ============================================================================
-- 2) subscription_events: hide raw_payload from non-service roles
-- ============================================================================
REVOKE SELECT ON public.subscription_events FROM authenticated, anon;
GRANT SELECT
  (id, coach_id, stripe_subscription_id, stripe_customer_id, event_type,
   previous_status, new_status, previous_tier, new_tier, created_at)
  ON public.subscription_events TO authenticated;

-- ============================================================================
-- 3) workout_templates: team members of the coach can SELECT
-- ============================================================================
DROP POLICY IF EXISTS "Team members can read coach templates" ON public.workout_templates;
CREATE POLICY "Team members can read coach templates"
  ON public.workout_templates
  FOR SELECT TO authenticated
  USING (public.is_active_team_member_of(coach_id));
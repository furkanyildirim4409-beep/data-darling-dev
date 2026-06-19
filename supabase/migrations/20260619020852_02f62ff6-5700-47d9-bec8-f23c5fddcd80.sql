
-- 1) Strengthen self-update policy: also lock coach_id and subscription/billing fields
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
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
  AND NOT (stripe_customer_id IS DISTINCT FROM (SELECT p.stripe_customer_id FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (stripe_subscription_id IS DISTINCT FROM (SELECT p.stripe_subscription_id FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (subscription_current_period_end IS DISTINCT FROM (SELECT p.subscription_current_period_end FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (subscription_cancel_at_period_end IS DISTINCT FROM (SELECT p.subscription_cancel_at_period_end FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (iban IS DISTINCT FROM (SELECT p.iban FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (freeze_until IS DISTINCT FROM (SELECT p.freeze_until FROM public.profiles p WHERE p.id = auth.uid()))
);

-- 2) Restrict coach updates on athlete profiles: cannot alter billing/subscription/payout fields
DROP POLICY IF EXISTS "Coaches can update athlete profiles" ON public.profiles;
CREATE POLICY "Coaches can update athlete profiles"
ON public.profiles
FOR UPDATE
USING (coach_id = auth.uid())
WITH CHECK (
  coach_id = auth.uid()
  AND NOT (stripe_customer_id IS DISTINCT FROM (SELECT p.stripe_customer_id FROM public.profiles p WHERE p.id = profiles.id))
  AND NOT (stripe_subscription_id IS DISTINCT FROM (SELECT p.stripe_subscription_id FROM public.profiles p WHERE p.id = profiles.id))
  AND NOT (subscription_tier IS DISTINCT FROM (SELECT p.subscription_tier FROM public.profiles p WHERE p.id = profiles.id))
  AND NOT (subscription_status IS DISTINCT FROM (SELECT p.subscription_status FROM public.profiles p WHERE p.id = profiles.id))
  AND NOT (subscription_current_period_end IS DISTINCT FROM (SELECT p.subscription_current_period_end FROM public.profiles p WHERE p.id = profiles.id))
  AND NOT (subscription_cancel_at_period_end IS DISTINCT FROM (SELECT p.subscription_cancel_at_period_end FROM public.profiles p WHERE p.id = profiles.id))
  AND NOT (iban IS DISTINCT FROM (SELECT p.iban FROM public.profiles p WHERE p.id = profiles.id))
  AND NOT (freeze_until IS DISTINCT FROM (SELECT p.freeze_until FROM public.profiles p WHERE p.id = profiles.id))
  AND NOT (role IS DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = profiles.id))
  AND NOT (email IS DISTINCT FROM (SELECT p.email FROM public.profiles p WHERE p.id = profiles.id))
);

-- 3) Same restrictions for team-member (sub-coach) updates on athlete profiles
DROP POLICY IF EXISTS "Team members can update athlete profiles" ON public.profiles;
CREATE POLICY "Team members can update athlete profiles"
ON public.profiles
FOR UPDATE
USING (public.is_active_team_member_of(coach_id))
WITH CHECK (
  public.is_active_team_member_of(coach_id)
  AND NOT (stripe_customer_id IS DISTINCT FROM (SELECT p.stripe_customer_id FROM public.profiles p WHERE p.id = profiles.id))
  AND NOT (stripe_subscription_id IS DISTINCT FROM (SELECT p.stripe_subscription_id FROM public.profiles p WHERE p.id = profiles.id))
  AND NOT (subscription_tier IS DISTINCT FROM (SELECT p.subscription_tier FROM public.profiles p WHERE p.id = profiles.id))
  AND NOT (subscription_status IS DISTINCT FROM (SELECT p.subscription_status FROM public.profiles p WHERE p.id = profiles.id))
  AND NOT (subscription_current_period_end IS DISTINCT FROM (SELECT p.subscription_current_period_end FROM public.profiles p WHERE p.id = profiles.id))
  AND NOT (subscription_cancel_at_period_end IS DISTINCT FROM (SELECT p.subscription_cancel_at_period_end FROM public.profiles p WHERE p.id = profiles.id))
  AND NOT (iban IS DISTINCT FROM (SELECT p.iban FROM public.profiles p WHERE p.id = profiles.id))
  AND NOT (freeze_until IS DISTINCT FROM (SELECT p.freeze_until FROM public.profiles p WHERE p.id = profiles.id))
  AND NOT (coach_id IS DISTINCT FROM (SELECT p.coach_id FROM public.profiles p WHERE p.id = profiles.id))
  AND NOT (role IS DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = profiles.id))
  AND NOT (email IS DISTINCT FROM (SELECT p.email FROM public.profiles p WHERE p.id = profiles.id))
);

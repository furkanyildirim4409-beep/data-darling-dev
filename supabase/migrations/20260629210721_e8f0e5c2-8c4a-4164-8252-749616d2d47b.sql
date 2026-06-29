
-- ============================================================
-- Security Hardening: Profile PII lockdown + Edge rate-limit table
-- ============================================================

-- 1) Replace coach/team UPDATE policies with a trigger-based whitelist
DROP POLICY IF EXISTS "Coaches can update athlete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Team members can update athlete profiles" ON public.profiles;

CREATE POLICY "Coaches can update athlete profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Team members can update athlete profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_active_team_member_of(coach_id))
  WITH CHECK (public.is_active_team_member_of(coach_id));

-- Trigger function: when caller is NOT the profile owner, only a small
-- whitelist of coach-business columns may differ between OLD and NEW.
CREATE OR REPLACE FUNCTION public.enforce_coach_profile_write_whitelist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Self-edit, service role, or no auth context (server-side) → skip.
  IF auth.uid() IS NULL OR auth.uid() = NEW.id THEN
    RETURN NEW;
  END IF;

  -- Caller is acting as coach/team on someone else's profile.
  -- Only these columns are allowed to change. Everything else must be untouched.
  IF NEW.coach_id            IS DISTINCT FROM OLD.coach_id            THEN NULL; END IF;
  IF NEW.is_active           IS DISTINCT FROM OLD.is_active           THEN NULL; END IF;
  IF NEW.freeze_until        IS DISTINCT FROM OLD.freeze_until        THEN NULL; END IF;
  IF NEW.freeze_reason       IS DISTINCT FROM OLD.freeze_reason       THEN NULL; END IF;
  IF NEW.active_program_id   IS DISTINCT FROM OLD.active_program_id   THEN NULL; END IF;

  -- Block PII / financial / gamification / identity columns
  IF NEW.full_name           IS DISTINCT FROM OLD.full_name           THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete full_name'; END IF;
  IF NEW.username            IS DISTINCT FROM OLD.username            THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete username'; END IF;
  IF NEW.avatar_url          IS DISTINCT FROM OLD.avatar_url          THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete avatar_url'; END IF;
  IF NEW.bio                 IS DISTINCT FROM OLD.bio                 THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete bio'; END IF;
  IF NEW.email               IS DISTINCT FROM OLD.email               THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete email'; END IF;
  IF NEW.role                IS DISTINCT FROM OLD.role                THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete role'; END IF;
  IF NEW.birth_date          IS DISTINCT FROM OLD.birth_date          THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete birth_date'; END IF;
  IF NEW.gender              IS DISTINCT FROM OLD.gender              THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete gender'; END IF;
  IF NEW.height_cm           IS DISTINCT FROM OLD.height_cm           THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete height_cm'; END IF;
  IF NEW.current_weight      IS DISTINCT FROM OLD.current_weight      THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete current_weight'; END IF;
  IF NEW.target_weight       IS DISTINCT FROM OLD.target_weight       THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete target_weight'; END IF;
  IF NEW.fitness_goal        IS DISTINCT FROM OLD.fitness_goal        THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete fitness_goal'; END IF;
  IF NEW.activity_level      IS DISTINCT FROM OLD.activity_level      THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete activity_level'; END IF;
  IF NEW.gym_name            IS DISTINCT FROM OLD.gym_name            THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete gym_name'; END IF;
  IF NEW.specialty           IS DISTINCT FROM OLD.specialty           THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete specialty'; END IF;
  IF NEW.xp                  IS DISTINCT FROM OLD.xp                  THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete xp'; END IF;
  IF NEW.bio_coins           IS DISTINCT FROM OLD.bio_coins           THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete bio_coins'; END IF;
  IF NEW.level               IS DISTINCT FROM OLD.level               THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete level'; END IF;
  IF NEW.streak              IS DISTINCT FROM OLD.streak              THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete streak'; END IF;
  IF NEW.longest_streak      IS DISTINCT FROM OLD.longest_streak      THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete longest_streak'; END IF;
  IF NEW.total_volume_kg     IS DISTINCT FROM OLD.total_volume_kg     THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete total_volume_kg'; END IF;
  IF NEW.subscription_tier   IS DISTINCT FROM OLD.subscription_tier   THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete subscription_tier'; END IF;
  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete subscription_status'; END IF;
  IF NEW.subscription_current_period_end IS DISTINCT FROM OLD.subscription_current_period_end THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete subscription dates'; END IF;
  IF NEW.subscription_cancel_at_period_end IS DISTINCT FROM OLD.subscription_cancel_at_period_end THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete subscription cancel flag'; END IF;
  IF NEW.daily_calorie_target IS DISTINCT FROM OLD.daily_calorie_target THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete daily_calorie_target'; END IF;
  IF NEW.daily_protein_target IS DISTINCT FROM OLD.daily_protein_target THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete daily_protein_target'; END IF;
  IF NEW.daily_carb_target    IS DISTINCT FROM OLD.daily_carb_target    THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete daily_carb_target'; END IF;
  IF NEW.daily_fat_target     IS DISTINCT FROM OLD.daily_fat_target     THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete daily_fat_target'; END IF;
  IF NEW.notification_preferences IS DISTINCT FROM OLD.notification_preferences THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete notification_preferences'; END IF;
  IF NEW.notification_settings    IS DISTINCT FROM OLD.notification_settings    THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete notification_settings'; END IF;
  IF NEW.profile_private          IS DISTINCT FROM OLD.profile_private          THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete profile_private'; END IF;
  IF NEW.hide_from_leaderboard    IS DISTINCT FROM OLD.hide_from_leaderboard    THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete hide_from_leaderboard'; END IF;
  IF NEW.onboarding_completed     IS DISTINCT FROM OLD.onboarding_completed     THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete onboarding_completed'; END IF;
  IF NEW.instagram_sync_active    IS DISTINCT FROM OLD.instagram_sync_active    THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete instagram_sync_active'; END IF;
  IF NEW.whatsapp_notifications_enabled IS DISTINCT FROM OLD.whatsapp_notifications_enabled THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete whatsapp_notifications_enabled'; END IF;
  IF NEW.readiness_score          IS DISTINCT FROM OLD.readiness_score          THEN RAISE EXCEPTION 'SECURITY BLOCK: cannot modify athlete readiness_score'; END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_coach_profile_write_whitelist_trg ON public.profiles;
CREATE TRIGGER enforce_coach_profile_write_whitelist_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_coach_profile_write_whitelist();


-- 2) Edge function rate-limit counters (used by edge functions via service_role)
CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  user_id      uuid NOT NULL,
  bucket       text NOT NULL,
  window_start timestamptz NOT NULL,
  count        integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, bucket, window_start)
);

GRANT ALL ON public.edge_rate_limits TO service_role;
-- No anon/authenticated grants: only edge functions (service role) touch this table.

ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies → no client access. Service role bypasses RLS.

CREATE INDEX IF NOT EXISTS edge_rate_limits_window_idx
  ON public.edge_rate_limits (window_start);

-- Atomic counter increment helper used by edge functions.
CREATE OR REPLACE FUNCTION public.bump_edge_rate_limit(
  _user_id uuid,
  _bucket  text,
  _window  timestamptz
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.edge_rate_limits (user_id, bucket, window_start, count)
  VALUES (_user_id, _bucket, _window, 1)
  ON CONFLICT (user_id, bucket, window_start)
  DO UPDATE SET count = public.edge_rate_limits.count + 1
  RETURNING count INTO v_count;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bump_edge_rate_limit(uuid, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_edge_rate_limit(uuid, text, timestamptz) TO service_role;

-- Periodic cleanup of stale rate-limit rows (> 2 days)
CREATE OR REPLACE FUNCTION public.cleanup_edge_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.edge_rate_limits WHERE window_start < now() - interval '2 days';
$$;

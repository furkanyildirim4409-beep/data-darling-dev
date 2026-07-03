
-- ============================================================================
-- Secure RPC functions for sensitive coach->athlete subscription actions.
-- All bypass the profile write-whitelist trigger via SECURITY DEFINER (owner)
-- and enforce coach ownership internally.
-- ============================================================================

-- Allow SECURITY DEFINER (postgres) calls to bypass whitelist trigger
CREATE OR REPLACE FUNCTION public.enforce_coach_profile_write_whitelist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Admin / server-side bypass (RPC SECURITY DEFINER runs as postgres)
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- Self-edit or no auth context → skip.
  IF auth.uid() IS NULL OR auth.uid() = NEW.id THEN
    RETURN NEW;
  END IF;

  -- Caller is acting as coach/team on someone else's profile.
  IF NEW.coach_id            IS DISTINCT FROM OLD.coach_id            THEN NULL; END IF;
  IF NEW.is_active           IS DISTINCT FROM OLD.is_active           THEN NULL; END IF;
  IF NEW.freeze_until        IS DISTINCT FROM OLD.freeze_until        THEN NULL; END IF;
  IF NEW.freeze_reason       IS DISTINCT FROM OLD.freeze_reason       THEN NULL; END IF;
  IF NEW.active_program_id   IS DISTINCT FROM OLD.active_program_id   THEN NULL; END IF;

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
$function$;

-- ---------------------------------------------------------------------------
-- 1) FREEZE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.coach_freeze_athlete(
  p_athlete_id uuid,
  p_days integer,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_coach_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_days IS NULL OR p_days < 1 OR p_days > 365 THEN
    RAISE EXCEPTION 'Invalid duration (1-365 days)';
  END IF;

  SELECT coach_id INTO v_coach_id FROM public.profiles WHERE id = p_athlete_id;
  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'Forbidden: athlete has no coach';
  END IF;
  IF v_coach_id <> v_caller AND NOT public.is_active_team_member_of(v_coach_id) THEN
    RAISE EXCEPTION 'Forbidden: not your athlete';
  END IF;

  UPDATE public.profiles
     SET subscription_status = 'frozen',
         freeze_until        = now() + make_interval(days => p_days),
         freeze_reason       = NULLIF(trim(coalesce(p_reason,'')), ''),
         updated_at          = now()
   WHERE id = p_athlete_id;
END;
$$;

REVOKE ALL ON FUNCTION public.coach_freeze_athlete(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_freeze_athlete(uuid, integer, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) UNFREEZE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.coach_unfreeze_athlete(p_athlete_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_coach_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT coach_id INTO v_coach_id FROM public.profiles WHERE id = p_athlete_id;
  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'Forbidden: athlete has no coach';
  END IF;
  IF v_coach_id <> v_caller AND NOT public.is_active_team_member_of(v_coach_id) THEN
    RAISE EXCEPTION 'Forbidden: not your athlete';
  END IF;

  UPDATE public.profiles
     SET subscription_status = 'active',
         freeze_until        = NULL,
         freeze_reason       = NULL,
         updated_at          = now()
   WHERE id = p_athlete_id;
END;
$$;

REVOKE ALL ON FUNCTION public.coach_unfreeze_athlete(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_unfreeze_athlete(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) TERMINATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.coach_terminate_athlete(p_athlete_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_coach_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT coach_id INTO v_coach_id FROM public.profiles WHERE id = p_athlete_id;
  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'Forbidden: athlete has no coach';
  END IF;
  IF v_coach_id <> v_caller AND NOT public.is_active_team_member_of(v_coach_id) THEN
    RAISE EXCEPTION 'Forbidden: not your athlete';
  END IF;

  UPDATE public.profiles
     SET subscription_status = 'terminated',
         coach_id            = NULL,
         active_program_id   = NULL,
         updated_at          = now()
   WHERE id = p_athlete_id;
END;
$$;

REVOKE ALL ON FUNCTION public.coach_terminate_athlete(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_terminate_athlete(uuid) TO authenticated;

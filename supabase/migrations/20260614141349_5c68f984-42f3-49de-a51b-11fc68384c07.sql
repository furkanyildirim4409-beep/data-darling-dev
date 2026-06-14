
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled boolean NOT NULL DEFAULT false;

-- Drop both overloads of update_own_profile
DROP FUNCTION IF EXISTS public.update_own_profile(text, text, text, text, text, jsonb, jsonb, date, numeric, numeric, numeric, text, text, text, boolean, integer, integer, integer, integer);
DROP FUNCTION IF EXISTS public.update_own_profile(text, text, text, text, text, jsonb, jsonb, date, numeric, numeric, numeric, text, text, text, boolean, integer, integer, integer, integer, text, boolean);

CREATE OR REPLACE FUNCTION public.update_own_profile(
  _full_name text DEFAULT NULL,
  _bio text DEFAULT NULL,
  _gym_name text DEFAULT NULL,
  _specialty text DEFAULT NULL,
  _avatar_url text DEFAULT NULL,
  _notification_preferences jsonb DEFAULT NULL,
  _notification_settings jsonb DEFAULT NULL,
  _birth_date date DEFAULT NULL,
  _height_cm numeric DEFAULT NULL,
  _current_weight numeric DEFAULT NULL,
  _target_weight numeric DEFAULT NULL,
  _gender text DEFAULT NULL,
  _fitness_goal text DEFAULT NULL,
  _activity_level text DEFAULT NULL,
  _onboarding_completed boolean DEFAULT NULL,
  _daily_calorie_target integer DEFAULT NULL,
  _daily_protein_target integer DEFAULT NULL,
  _daily_carb_target integer DEFAULT NULL,
  _daily_fat_target integer DEFAULT NULL,
  _username text DEFAULT NULL,
  _instagram_sync_active boolean DEFAULT NULL,
  _whatsapp_notifications_enabled boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles
  SET
    full_name = COALESCE(_full_name, full_name),
    bio = COALESCE(_bio, bio),
    gym_name = COALESCE(_gym_name, gym_name),
    specialty = COALESCE(_specialty, specialty),
    avatar_url = COALESCE(_avatar_url, avatar_url),
    notification_preferences = COALESCE(_notification_preferences, notification_preferences),
    notification_settings = COALESCE(_notification_settings, notification_settings),
    birth_date = COALESCE(_birth_date, birth_date),
    height_cm = COALESCE(_height_cm, height_cm),
    current_weight = COALESCE(_current_weight, current_weight),
    target_weight = COALESCE(_target_weight, target_weight),
    gender = COALESCE(_gender, gender),
    fitness_goal = COALESCE(_fitness_goal, fitness_goal),
    activity_level = COALESCE(_activity_level, activity_level),
    onboarding_completed = COALESCE(_onboarding_completed, onboarding_completed),
    daily_calorie_target = COALESCE(_daily_calorie_target, daily_calorie_target),
    daily_protein_target = COALESCE(_daily_protein_target, daily_protein_target),
    daily_carb_target = COALESCE(_daily_carb_target, daily_carb_target),
    daily_fat_target = COALESCE(_daily_fat_target, daily_fat_target),
    username = COALESCE(NULLIF(lower(trim(_username)), ''), username),
    instagram_sync_active = COALESCE(_instagram_sync_active, instagram_sync_active),
    whatsapp_notifications_enabled = COALESCE(_whatsapp_notifications_enabled, whatsapp_notifications_enabled),
    updated_at = now()
  WHERE id = auth.uid();
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_coach_info(_coach_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'full_name', full_name,
    'avatar_url', avatar_url,
    'gym_name', gym_name
  )
  FROM public.profiles WHERE id = _coach_id
$function$;


-- 1. Create a SECURITY DEFINER function for safe profile updates
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
  _daily_fat_target integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    updated_at = now()
  WHERE id = auth.uid();
END;
$$;

-- 2. Drop the broad user self-update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 3. Make progress-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'progress-photos';

-- 4. Drop existing public read policy on progress-photos objects
DROP POLICY IF EXISTS "Public read progress photos" ON storage.objects;

-- 5. Add authenticated owner-only SELECT policy for progress-photos
CREATE POLICY "Authenticated users read own progress photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 6. Add coach SELECT policy for progress-photos
CREATE POLICY "Coaches can view athlete progress photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND public.is_coach_of((storage.foldername(name))[1]::uuid)
);

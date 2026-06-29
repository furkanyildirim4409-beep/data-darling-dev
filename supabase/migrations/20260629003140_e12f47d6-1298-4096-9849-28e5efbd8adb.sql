
-- Drop any existing public_* views first
DROP VIEW IF EXISTS public.public_coach_profiles CASCADE;
DROP VIEW IF EXISTS public.public_profiles CASCADE;

-- FIX 1: tighten profiles SELECT
DROP POLICY IF EXISTS "Authenticated can view coach profiles" ON public.profiles;

-- Safe coach directory via SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.get_public_coach_profiles()
RETURNS TABLE (
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  bio text,
  specialty text,
  gym_name text,
  level integer,
  is_active boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, full_name, username, avatar_url, bio, specialty, gym_name, level, is_active
  FROM public.profiles
  WHERE role = 'coach' AND COALESCE(is_active, true) = true;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_coach_profiles() TO anon, authenticated;

-- Safe basic profile fetch for cross-user UI
CREATE OR REPLACE FUNCTION public.get_public_profiles(_ids uuid[])
RETURNS TABLE (
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  role text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, full_name, username, avatar_url, role
  FROM public.profiles
  WHERE id = ANY(_ids);
$$;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO anon, authenticated;

-- Username availability (used during signup; no row exposure)
CREATE OR REPLACE FUNCTION public.is_username_available(_username text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(username) = lower(trim(_username))
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;

-- FIX 2: Auto-login tokens never readable by clients
REVOKE SELECT ON public.auto_login_tokens FROM anon, authenticated;

-- FIX 4A: Athletes can read their own weekly analyses
DROP POLICY IF EXISTS "Athletes can read own weekly analyses" ON public.ai_weekly_analyses;
CREATE POLICY "Athletes can read own weekly analyses"
ON public.ai_weekly_analyses
FOR SELECT
TO authenticated
USING (athlete_id = auth.uid());

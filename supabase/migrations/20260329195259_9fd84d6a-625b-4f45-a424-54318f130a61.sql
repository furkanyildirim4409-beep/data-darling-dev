-- 1. Make chat-media bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-media';

-- 2. Drop the public read policy on chat-media
DROP POLICY IF EXISTS "Public read access for chat media" ON storage.objects;

-- 3. Add authenticated-only read policy for chat-media
CREATE POLICY "Authenticated users read chat media"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-media' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.messages
        WHERE (sender_id = auth.uid() OR receiver_id = auth.uid())
          AND media_url LIKE '%' || storage.filename(name) || '%'
      )
    )
  );

-- 4. Add upload policy for chat-media (users upload to their own folder)
CREATE POLICY "Authenticated users upload chat media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Fix profiles: drop the broad leaderboard policy
DROP POLICY IF EXISTS "Authenticated can read leaderboard profiles" ON public.profiles;

-- 6. Recreate leaderboard_profiles as a security_invoker view with limited columns
DROP VIEW IF EXISTS public.leaderboard_profiles;
CREATE VIEW public.leaderboard_profiles
  WITH (security_invoker = true)
AS
  SELECT id, full_name, avatar_url, xp, streak, total_volume_kg, bio_coins, level, role
  FROM public.profiles
  WHERE role = 'athlete';

-- 7. Add a narrow leaderboard SELECT policy scoped to own/coach/team
CREATE POLICY "Authenticated can read athlete leaderboard data"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    role = 'athlete' AND (
      auth.uid() = id
      OR coach_id = auth.uid()
      OR public.is_active_team_member_of(coach_id)
    )
  );

-- 8. Fix team_members: drop the overly broad peer visibility policy
DROP POLICY IF EXISTS "Team members can view peers safe" ON public.team_members;

-- 9. Create a function to get peer team member safe data (without email/phone)
CREATE OR REPLACE FUNCTION public.get_team_peers(_head_coach_id uuid)
RETURNS TABLE(
  id uuid,
  full_name text,
  role text,
  avatar_url text,
  status text,
  athletes_count integer,
  permissions text,
  custom_permissions jsonb,
  start_date date,
  created_at timestamptz,
  updated_at timestamptz,
  user_id uuid,
  head_coach_id uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    tm.id, tm.full_name, tm.role, tm.avatar_url, tm.status,
    tm.athletes_count, tm.permissions, tm.custom_permissions,
    tm.start_date, tm.created_at, tm.updated_at, tm.user_id, tm.head_coach_id
  FROM public.team_members tm
  WHERE tm.head_coach_id = _head_coach_id
    AND (
      tm.user_id = auth.uid()
      OR tm.head_coach_id = auth.uid()
      OR public.is_active_team_member_of(_head_coach_id)
    );
$$;
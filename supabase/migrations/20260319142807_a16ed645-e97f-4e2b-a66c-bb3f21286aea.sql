CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  head_coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'assistant_coach',
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
  permissions text NOT NULL DEFAULT 'limited',
  status text NOT NULL DEFAULT 'pending',
  athletes_count integer NOT NULL DEFAULT 0,
  start_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (head_coach_id, email)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Head coaches can view own team" ON public.team_members FOR SELECT TO authenticated USING (head_coach_id = auth.uid());
CREATE POLICY "Members can view own record" ON public.team_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Head coaches can insert team members" ON public.team_members FOR INSERT TO authenticated WITH CHECK (head_coach_id = auth.uid());
CREATE POLICY "Head coaches can update team members" ON public.team_members FOR UPDATE TO authenticated USING (head_coach_id = auth.uid());
CREATE POLICY "Head coaches can delete team members" ON public.team_members FOR DELETE TO authenticated USING (head_coach_id = auth.uid());
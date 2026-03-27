CREATE TABLE public.academy_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Antrenman',
  type TEXT NOT NULL DEFAULT 'Video',
  url TEXT DEFAULT '',
  thumbnail TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own academy content"
  ON public.academy_content FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Team members manage academy content"
  ON public.academy_content FOR ALL TO authenticated
  USING (is_active_team_member_of(coach_id))
  WITH CHECK (is_active_team_member_of(coach_id));

CREATE POLICY "Athletes can view coach academy content"
  ON public.academy_content FOR SELECT TO authenticated
  USING (coach_id = (SELECT coach_id FROM profiles WHERE id = auth.uid()));
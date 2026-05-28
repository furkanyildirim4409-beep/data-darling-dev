CREATE TABLE IF NOT EXISTS public.athlete_ai_status_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  analysis_type TEXT NOT NULL DEFAULT 'holistic_forecast',
  analysis_text TEXT NOT NULL,
  student_goal_snapshot TEXT,
  context_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_status_logs_athlete ON public.athlete_ai_status_logs(athlete_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.athlete_ai_status_logs TO authenticated;
GRANT ALL ON public.athlete_ai_status_logs TO service_role;

ALTER TABLE public.athlete_ai_status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach team can view AI logs"
  ON public.athlete_ai_status_logs FOR SELECT TO authenticated
  USING (auth.uid() = coach_id OR public.is_active_team_member_of(coach_id));

CREATE POLICY "Coach team can insert AI logs"
  ON public.athlete_ai_status_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = coach_id OR public.is_active_team_member_of(coach_id));

CREATE POLICY "Coach team can delete AI logs"
  ON public.athlete_ai_status_logs FOR DELETE TO authenticated
  USING (auth.uid() = coach_id OR public.is_active_team_member_of(coach_id));
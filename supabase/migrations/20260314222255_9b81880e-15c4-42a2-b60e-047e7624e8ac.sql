
CREATE TABLE public.ai_weekly_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  severity text NOT NULL DEFAULT 'low',
  title text NOT NULL,
  analysis text NOT NULL,
  athlete_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_weekly_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can select own analyses"
  ON public.ai_weekly_analyses FOR SELECT TO authenticated
  USING (coach_id = auth.uid());

CREATE POLICY "Coaches can insert own analyses"
  ON public.ai_weekly_analyses FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches can delete own analyses"
  ON public.ai_weekly_analyses FOR DELETE TO authenticated
  USING (coach_id = auth.uid());

CREATE INDEX idx_ai_analyses_coach_created
  ON public.ai_weekly_analyses (coach_id, created_at DESC);

CREATE INDEX idx_ai_analyses_athlete
  ON public.ai_weekly_analyses (athlete_id);

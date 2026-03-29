
-- 1. Create assigned_diet_days table
CREATE TABLE public.assigned_diet_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  template_id UUID NOT NULL,
  target_date DATE NOT NULL,
  day_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (athlete_id, target_date)
);

ALTER TABLE public.assigned_diet_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can view own assigned diet days"
  ON public.assigned_diet_days FOR SELECT TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Coaches can manage assigned diet days"
  ON public.assigned_diet_days FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Team members can manage assigned diet days"
  ON public.assigned_diet_days FOR ALL TO authenticated
  USING (is_active_team_member_of(coach_id))
  WITH CHECK (is_active_team_member_of(coach_id));

CREATE INDEX idx_assigned_diet_days_athlete_date ON public.assigned_diet_days (athlete_id, target_date);

-- 2. Add columns to consumed_foods
ALTER TABLE public.consumed_foods
  ADD COLUMN target_serving TEXT DEFAULT NULL,
  ADD COLUMN consumed_serving TEXT DEFAULT NULL,
  ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';

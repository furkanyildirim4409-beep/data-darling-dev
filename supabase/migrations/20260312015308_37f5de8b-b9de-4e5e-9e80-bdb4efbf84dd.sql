
-- Junction table for multiple diet template assignments per athlete (max 7 enforced in app)
CREATE TABLE public.athlete_diet_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  template_id uuid NOT NULL REFERENCES public.diet_templates(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (athlete_id, template_id)
);

ALTER TABLE public.athlete_diet_assignments ENABLE ROW LEVEL SECURITY;

-- Coaches can manage assignments for their athletes
CREATE POLICY "Coaches manage diet assignments"
  ON public.athlete_diet_assignments
  FOR ALL
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Athletes can view their own assignments
CREATE POLICY "Athletes view own diet assignments"
  ON public.athlete_diet_assignments
  FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

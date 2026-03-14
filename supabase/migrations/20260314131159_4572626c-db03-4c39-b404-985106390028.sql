CREATE TABLE public.program_assignment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  program_id uuid NOT NULL,
  program_title text NOT NULL,
  action text NOT NULL DEFAULT 'assigned',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.program_assignment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage assignment logs" ON public.program_assignment_logs
  FOR ALL TO authenticated
  USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Athletes view own assignment logs" ON public.program_assignment_logs
  FOR SELECT TO authenticated
  USING (athlete_id = auth.uid());
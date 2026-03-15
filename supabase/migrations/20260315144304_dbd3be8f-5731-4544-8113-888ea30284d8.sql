
CREATE TABLE public.mutation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  module_type text NOT NULL,
  change_percentage numeric NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mutation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can select own mutation logs"
  ON public.mutation_logs FOR SELECT TO authenticated
  USING (coach_id = auth.uid());

CREATE POLICY "Coaches can insert mutation logs"
  ON public.mutation_logs FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Athletes can view own mutation logs"
  ON public.mutation_logs FOR SELECT TO authenticated
  USING (athlete_id = auth.uid());

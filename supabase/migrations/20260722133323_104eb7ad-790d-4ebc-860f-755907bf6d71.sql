CREATE TABLE public.dismissed_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id uuid NOT NULL,
  alert_key text NOT NULL,
  resolved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, alert_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dismissed_alerts TO authenticated;
GRANT ALL ON public.dismissed_alerts TO service_role;

ALTER TABLE public.dismissed_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach manages own dismissed alerts"
  ON public.dismissed_alerts
  FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

CREATE INDEX dismissed_alerts_coach_id_idx ON public.dismissed_alerts (coach_id);
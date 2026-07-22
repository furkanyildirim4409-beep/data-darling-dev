
CREATE TABLE public.coach_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  athlete_id uuid NULL,
  athlete_label text NOT NULL,
  session_type text NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_time time NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX coach_sessions_coach_date_idx ON public.coach_sessions (coach_id, scheduled_date);
CREATE INDEX coach_sessions_athlete_idx ON public.coach_sessions (athlete_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_sessions TO authenticated;
GRANT ALL ON public.coach_sessions TO service_role;

ALTER TABLE public.coach_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach manages own sessions"
ON public.coach_sessions
FOR ALL
TO authenticated
USING (coach_id = auth.uid() OR public.is_active_team_member_of(coach_id))
WITH CHECK (coach_id = auth.uid() OR public.is_active_team_member_of(coach_id));

CREATE POLICY "Athlete reads own sessions"
ON public.coach_sessions
FOR SELECT
TO authenticated
USING (athlete_id = auth.uid());

CREATE OR REPLACE FUNCTION public.coach_sessions_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_coach_sessions_updated_at
BEFORE UPDATE ON public.coach_sessions
FOR EACH ROW EXECUTE FUNCTION public.coach_sessions_touch_updated_at();


-- Table: athlete_notifications
CREATE TABLE public.athlete_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  coach_id uuid,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'ai_action',
  is_read boolean NOT NULL DEFAULT false,
  source_insight_id uuid REFERENCES public.ai_weekly_analyses(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.athlete_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can view own notifications"
  ON public.athlete_notifications FOR SELECT TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Athletes can update own notifications"
  ON public.athlete_notifications FOR UPDATE TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Coaches can insert notifications for their athletes"
  ON public.athlete_notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_coach_of(athlete_id));

CREATE POLICY "Coaches can view notifications they sent"
  ON public.athlete_notifications FOR SELECT TO authenticated
  USING (coach_id = auth.uid());

-- Table: assigned_supplements
CREATE TABLE public.assigned_supplements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  name_and_dosage text NOT NULL,
  source_insight_id uuid REFERENCES public.ai_weekly_analyses(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assigned_supplements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can view own supplements"
  ON public.assigned_supplements FOR SELECT TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Coaches can manage supplements for their athletes"
  ON public.assigned_supplements FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

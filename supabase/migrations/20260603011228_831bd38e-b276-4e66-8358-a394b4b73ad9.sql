CREATE TABLE public.coach_action_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  issue_type text NOT NULL,
  issue_title text NOT NULL,
  issue_details jsonb,
  source_insight_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','failed','ignored')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX coach_action_ledger_unique_insight
  ON public.coach_action_ledger (coach_id, source_insight_id)
  WHERE source_insight_id IS NOT NULL;

CREATE INDEX coach_action_ledger_coach_status_idx
  ON public.coach_action_ledger (coach_id, status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_action_ledger TO authenticated;
GRANT ALL ON public.coach_action_ledger TO service_role;

ALTER TABLE public.coach_action_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach or team members can view ledger"
  ON public.coach_action_ledger FOR SELECT TO authenticated
  USING (coach_id = auth.uid() OR public.is_active_team_member_of(coach_id));

CREATE POLICY "Coach or team members can insert ledger"
  ON public.coach_action_ledger FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid() OR public.is_active_team_member_of(coach_id));

CREATE POLICY "Coach or team members can update ledger"
  ON public.coach_action_ledger FOR UPDATE TO authenticated
  USING (coach_id = auth.uid() OR public.is_active_team_member_of(coach_id))
  WITH CHECK (coach_id = auth.uid() OR public.is_active_team_member_of(coach_id));

CREATE POLICY "Coach or team members can delete ledger"
  ON public.coach_action_ledger FOR DELETE TO authenticated
  USING (coach_id = auth.uid() OR public.is_active_team_member_of(coach_id));

CREATE TRIGGER coach_action_ledger_touch_updated_at
  BEFORE UPDATE ON public.coach_action_ledger
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.coach_action_ledger;
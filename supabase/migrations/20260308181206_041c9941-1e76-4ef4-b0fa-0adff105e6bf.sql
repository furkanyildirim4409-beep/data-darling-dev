-- RLS for assigned_workouts
ALTER TABLE public.assigned_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view own assignments"
ON public.assigned_workouts FOR SELECT TO authenticated
USING (coach_id = auth.uid());

CREATE POLICY "Coaches can insert own assignments"
ON public.assigned_workouts FOR INSERT TO authenticated
WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches can update own assignments"
ON public.assigned_workouts FOR UPDATE TO authenticated
USING (coach_id = auth.uid());

CREATE POLICY "Coaches can delete own assignments"
ON public.assigned_workouts FOR DELETE TO authenticated
USING (coach_id = auth.uid());

-- Athletes can view their own assignments
CREATE POLICY "Athletes can view own assignments"
ON public.assigned_workouts FOR SELECT TO authenticated
USING (athlete_id = auth.uid());
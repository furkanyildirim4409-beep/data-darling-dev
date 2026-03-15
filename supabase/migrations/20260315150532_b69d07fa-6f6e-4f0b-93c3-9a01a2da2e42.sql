
-- Ultimate Fix: Add permissive UPDATE policy for assigned_workouts
-- This covers legacy rows where coach_id might be NULL but coach owns the athlete
CREATE POLICY "Coaches can update via athlete ownership"
ON public.assigned_workouts
FOR UPDATE
TO authenticated
USING (public.is_coach_of(athlete_id))
WITH CHECK (public.is_coach_of(athlete_id));

CREATE POLICY "Coaches can view own stories"
ON public.coach_stories
FOR SELECT
TO authenticated
USING (coach_id = auth.uid());
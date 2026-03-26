CREATE POLICY "Coaches can view disputed challenges"
ON public.challenges
FOR SELECT
TO authenticated
USING (
  status = 'disputed' AND (
    is_coach_of(challenger_id) OR is_coach_of(opponent_id)
  )
);
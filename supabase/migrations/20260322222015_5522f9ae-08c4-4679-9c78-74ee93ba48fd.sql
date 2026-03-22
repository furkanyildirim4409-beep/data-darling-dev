-- Allow team members to view other team members in the same agency
-- This enables sub-coaches to see their peers in team chat contacts
CREATE POLICY "Team members can view peers"
  ON public.team_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members AS my
      WHERE my.user_id = auth.uid()
        AND my.head_coach_id = team_members.head_coach_id
        AND my.status = 'active'
    )
  );
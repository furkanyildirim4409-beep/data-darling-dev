-- 1. Drop the flawed recursive policy
DROP POLICY IF EXISTS "Team members can view peers" ON public.team_members;

-- 2. Create the secure bypass function
CREATE OR REPLACE FUNCTION public.get_my_head_coach_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach_id uuid;
BEGIN
  SELECT id INTO v_coach_id FROM public.profiles WHERE id = auth.uid() AND role = 'coach' LIMIT 1;
  IF v_coach_id IS NOT NULL THEN
    RETURN v_coach_id;
  END IF;

  SELECT head_coach_id INTO v_coach_id FROM public.team_members WHERE user_id = auth.uid() LIMIT 1;
  RETURN v_coach_id;
END;
$$;

-- 3. Create the safe RLS policy
CREATE POLICY "Team members can view peers safe"
ON public.team_members FOR SELECT TO authenticated
USING (
  head_coach_id = public.get_my_head_coach_id() OR 
  user_id = auth.uid() OR 
  head_coach_id = auth.uid()
);
-- Fix: Check team_members FIRST so sub-coaches get their head_coach_id, not their own id
CREATE OR REPLACE FUNCTION public.get_my_head_coach_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach_id uuid;
BEGIN
  -- First check if user is a sub-coach (team member) — must come before profile check
  SELECT head_coach_id INTO v_coach_id FROM public.team_members WHERE user_id = auth.uid() AND status = 'active' LIMIT 1;
  IF v_coach_id IS NOT NULL THEN
    RETURN v_coach_id;
  END IF;

  -- If not a team member, check if user is a head coach
  SELECT id INTO v_coach_id FROM public.profiles WHERE id = auth.uid() AND role = 'coach' LIMIT 1;
  RETURN v_coach_id;
END;
$$;
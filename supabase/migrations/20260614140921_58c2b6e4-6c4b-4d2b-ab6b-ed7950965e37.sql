CREATE OR REPLACE FUNCTION public.set_team_member_active(_team_member_id uuid, _is_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_row record;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row FROM public.team_members WHERE id = _team_member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team member not found';
  END IF;

  IF v_row.head_coach_id <> v_caller THEN
    RAISE EXCEPTION 'Only the head coach can change member status';
  END IF;

  UPDATE public.team_members
    SET status = CASE WHEN _is_active THEN 'active' ELSE 'inactive' END,
        updated_at = now()
    WHERE id = _team_member_id;

  IF v_row.user_id IS NOT NULL THEN
    UPDATE public.profiles
      SET is_active = _is_active,
          updated_at = now()
      WHERE id = v_row.user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_team_member_active(uuid, boolean) TO authenticated;
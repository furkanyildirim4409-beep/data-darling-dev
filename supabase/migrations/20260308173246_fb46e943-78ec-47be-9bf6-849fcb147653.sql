
CREATE OR REPLACE FUNCTION public.link_athlete_to_coach(_coach_id uuid, _athlete_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _athlete_id uuid;
  _existing_coach uuid;
BEGIN
  SELECT id, coach_id INTO _athlete_id, _existing_coach
  FROM public.profiles
  WHERE email = lower(_athlete_email) AND role = 'athlete';

  IF _athlete_id IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF _existing_coach IS NOT NULL AND _existing_coach != _coach_id THEN
    RETURN jsonb_build_object('status', 'already_linked');
  END IF;

  IF _existing_coach = _coach_id THEN
    RETURN jsonb_build_object('status', 'already_yours');
  END IF;

  UPDATE public.profiles SET coach_id = _coach_id, updated_at = now() WHERE id = _athlete_id;

  RETURN jsonb_build_object('status', 'ok');
END;
$$;

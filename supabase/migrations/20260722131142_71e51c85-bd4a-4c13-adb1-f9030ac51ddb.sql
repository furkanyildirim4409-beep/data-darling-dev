
CREATE OR REPLACE FUNCTION public.assign_diet_template(
  _athlete_id uuid,
  _coach_id uuid,
  _template_id uuid,
  _start_date date,
  _duration_weeks int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (auth.uid() = _coach_id OR public.is_active_team_member_of(_coach_id)) THEN
    RAISE EXCEPTION 'Not authorized to assign diet for this coach';
  END IF;

  IF _duration_weeks IS NULL OR _duration_weeks < 1 OR _duration_weeks > 52 THEN
    RAISE EXCEPTION 'Invalid duration_weeks';
  END IF;

  -- 1. Delete future assigned_diet_days from start_date onward
  DELETE FROM public.assigned_diet_days
  WHERE athlete_id = _athlete_id
    AND target_date >= _start_date;

  -- 2. Insert new rows only for days that have food in the template
  INSERT INTO public.assigned_diet_days (athlete_id, coach_id, template_id, target_date, day_number)
  SELECT
    _athlete_id,
    _coach_id,
    _template_id,
    (_start_date + (i || ' days')::interval)::date,
    ((i % 7) + 1)::int
  FROM generate_series(0, (_duration_weeks * 7) - 1) AS i
  WHERE ((i % 7) + 1) IN (
    SELECT DISTINCT COALESCE(day_number, 1)
    FROM public.diet_template_foods
    WHERE template_id = _template_id
  );

  -- 3. Upsert nutrition_targets
  INSERT INTO public.nutrition_targets (athlete_id, coach_id, active_diet_template_id, diet_start_date, diet_duration_weeks, updated_at)
  VALUES (_athlete_id, _coach_id, _template_id, _start_date, _duration_weeks, now())
  ON CONFLICT (athlete_id) DO UPDATE
  SET coach_id = EXCLUDED.coach_id,
      active_diet_template_id = EXCLUDED.active_diet_template_id,
      diet_start_date = EXCLUDED.diet_start_date,
      diet_duration_weeks = EXCLUDED.diet_duration_weeks,
      updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_diet_template(uuid, uuid, uuid, date, int) TO authenticated;

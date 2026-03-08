
-- Security definer function: check if current user is coach of a given user
CREATE OR REPLACE FUNCTION public.is_coach_of(_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _athlete_id AND coach_id = auth.uid()
  )
$$;

-- Coaches can view their athletes' profiles
CREATE POLICY "Coaches can view athlete profiles"
  ON public.profiles FOR SELECT
  USING (coach_id = auth.uid());

-- Coaches can update their athletes' profiles
CREATE POLICY "Coaches can update athlete profiles"
  ON public.profiles FOR UPDATE
  USING (coach_id = auth.uid());

-- Coaches can view their athletes' workout logs
CREATE POLICY "Coaches can view athlete workout logs"
  ON public.workout_logs FOR SELECT
  USING (public.is_coach_of(user_id));

-- Coaches can view their athletes' nutrition logs
CREATE POLICY "Coaches can view athlete nutrition logs"
  ON public.nutrition_logs FOR SELECT
  USING (public.is_coach_of(user_id));

-- Coaches can view their athletes' daily checkins
CREATE POLICY "Coaches can view athlete checkins"
  ON public.daily_checkins FOR SELECT
  USING (public.is_coach_of(user_id));

-- Coaches can view their athletes' weight logs
CREATE POLICY "Coaches can view athlete weight logs"
  ON public.weight_logs FOR SELECT
  USING (public.is_coach_of(user_id));

-- Coaches can view their athletes' water logs
CREATE POLICY "Coaches can view athlete water logs"
  ON public.water_logs FOR SELECT
  USING (public.is_coach_of(user_id));

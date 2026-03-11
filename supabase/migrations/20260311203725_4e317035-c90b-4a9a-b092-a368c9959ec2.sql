
CREATE TABLE public.consumed_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id uuid REFERENCES public.nutrition_logs(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL,
  meal_type text NOT NULL DEFAULT 'snack',
  food_name text NOT NULL,
  serving_size text,
  calories integer DEFAULT 0,
  protein numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  fat numeric DEFAULT 0,
  api_food_id text,
  logged_at timestamptz DEFAULT now()
);

ALTER TABLE public.consumed_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view athlete foods"
  ON public.consumed_foods FOR SELECT TO authenticated
  USING (is_coach_of(athlete_id));

CREATE POLICY "Athletes manage own foods"
  ON public.consumed_foods FOR ALL TO authenticated
  USING (auth.uid() = athlete_id) WITH CHECK (auth.uid() = athlete_id);

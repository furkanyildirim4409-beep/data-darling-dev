
CREATE TABLE public.nutrition_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL UNIQUE,
  coach_id uuid NOT NULL,
  daily_calories integer NOT NULL DEFAULT 2000,
  protein_g integer NOT NULL DEFAULT 150,
  carbs_g integer NOT NULL DEFAULT 250,
  fat_g integer NOT NULL DEFAULT 70,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.nutrition_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage athlete targets"
  ON public.nutrition_targets FOR ALL TO authenticated
  USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Athletes can view own targets"
  ON public.nutrition_targets FOR SELECT TO authenticated
  USING (athlete_id = auth.uid());

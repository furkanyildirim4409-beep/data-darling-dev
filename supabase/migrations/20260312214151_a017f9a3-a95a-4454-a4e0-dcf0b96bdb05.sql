
CREATE TABLE public.food_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text DEFAULT 'Genel',
  calories integer DEFAULT 0,
  protein numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  fat numeric DEFAULT 0,
  serving_size text DEFAULT '100g',
  api_food_id text,
  coach_id uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(name, coach_id)
);

ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own food items"
  ON public.food_items FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "All authenticated can view food items"
  ON public.food_items FOR SELECT TO authenticated
  USING (true);


-- Diet Templates table
CREATE TABLE public.diet_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  target_calories integer DEFAULT 2000,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.diet_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own diet templates"
  ON public.diet_templates FOR ALL TO authenticated
  USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- Diet Template Foods table
CREATE TABLE public.diet_template_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.diet_templates(id) ON DELETE CASCADE NOT NULL,
  meal_type text NOT NULL DEFAULT 'snack',
  food_name text NOT NULL,
  serving_size text,
  calories integer DEFAULT 0,
  protein numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  fat numeric DEFAULT 0
);

ALTER TABLE public.diet_template_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own template foods"
  ON public.diet_template_foods FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.diet_templates WHERE id = template_id AND coach_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.diet_templates WHERE id = template_id AND coach_id = auth.uid()));

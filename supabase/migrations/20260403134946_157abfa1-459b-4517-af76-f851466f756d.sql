
-- 1. supplements_library — Global supplement catalog
CREATE TABLE public.supplements_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Genel',
  default_dosage text,
  description text,
  icon text NOT NULL DEFAULT '💊',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supplements_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view supplements library"
  ON public.supplements_library FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Coaches can manage supplements library"
  ON public.supplements_library FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'coach'::app_role))
  WITH CHECK (has_role(auth.uid(), 'coach'::app_role));

-- Seed data
INSERT INTO public.supplements_library (name, category, default_dosage, description, icon) VALUES
  ('Creatine Monohydrate', 'Performans', '5g/gün', 'Kas gücü ve dayanıklılık desteği', '💪'),
  ('Whey Protein', 'Protein', '30g/servis', 'Hızlı emilen protein tozu', '🥤'),
  ('Omega 3', 'Sağlık', '1000mg', 'Balık yağı - EPA/DHA', '🐟'),
  ('Magnesium Bisglycinate', 'Mineral', '400mg', 'Kas gevşemesi ve uyku desteği', '💊'),
  ('Vitamin D3+K2', 'Vitamin', '2000IU', 'Kemik ve bağışıklık desteği', '☀️'),
  ('BCAA', 'Amino Asit', '10g', 'Dallı zincirli amino asitler', '🧴'),
  ('Pre-Workout', 'Performans', '1 ölçek', 'Antrenman öncesi enerji desteği', '⚡'),
  ('ZMA', 'Mineral', '3 kapsül', 'Çinko, magnezyum ve B6 vitamini', '🌙'),
  ('Beta-Alanine', 'Performans', '3.2g', 'Dayanıklılık ve tamponlama desteği', '💊'),
  ('Glutamine', 'Amino Asit', '5g', 'Kas toparlanma desteği', '💊');

-- 2. supplement_templates — Coach-owned templates
CREATE TABLE public.supplement_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  is_template boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supplement_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own supplement templates"
  ON public.supplement_templates FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Team members can manage supplement templates"
  ON public.supplement_templates FOR ALL TO authenticated
  USING (is_active_team_member_of(coach_id))
  WITH CHECK (is_active_team_member_of(coach_id));

-- 3. supplement_template_items — Items within a template
CREATE TABLE public.supplement_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.supplement_templates(id) ON DELETE CASCADE,
  supplement_name text NOT NULL,
  dosage text,
  timing text NOT NULL DEFAULT 'Sabah',
  icon text NOT NULL DEFAULT '💊',
  order_index integer NOT NULL DEFAULT 0
);

ALTER TABLE public.supplement_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own supplement template items"
  ON public.supplement_template_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.supplement_templates
    WHERE supplement_templates.id = supplement_template_items.template_id
      AND supplement_templates.coach_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.supplement_templates
    WHERE supplement_templates.id = supplement_template_items.template_id
      AND supplement_templates.coach_id = auth.uid()
  ));

CREATE POLICY "Team members can manage supplement template items"
  ON public.supplement_template_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.supplement_templates
    WHERE supplement_templates.id = supplement_template_items.template_id
      AND is_active_team_member_of(supplement_templates.coach_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.supplement_templates
    WHERE supplement_templates.id = supplement_template_items.template_id
      AND is_active_team_member_of(supplement_templates.coach_id)
  ));

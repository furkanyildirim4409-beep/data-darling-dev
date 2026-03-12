
-- Allow athletes to view template foods for their assigned templates (via athlete_diet_assignments)
CREATE POLICY "Athletes can view assigned template foods via assignments"
  ON public.diet_template_foods
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.athlete_diet_assignments ada
      WHERE ada.athlete_id = auth.uid()
        AND ada.template_id = diet_template_foods.template_id
    )
  );

-- Allow athletes to view diet templates assigned via athlete_diet_assignments
CREATE POLICY "Athletes can view templates via assignments"
  ON public.diet_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.athlete_diet_assignments ada
      WHERE ada.athlete_id = auth.uid()
        AND ada.template_id = diet_templates.id
    )
  );

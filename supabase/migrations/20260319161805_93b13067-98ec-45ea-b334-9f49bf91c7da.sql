-- ============================================================
-- Part 4: Sub-Coach RLS — Team Member Access Policies
-- ============================================================

-- 1. Helper: check if caller is an active team member of a head coach
CREATE OR REPLACE FUNCTION public.is_active_team_member_of(_head_coach_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE head_coach_id = _head_coach_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- 2. Extend is_coach_of to include team member check (cascades to ~12 tables)
CREATE OR REPLACE FUNCTION public.is_coach_of(_athlete_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _athlete_id
      AND (
        coach_id = auth.uid()
        OR public.is_active_team_member_of(coach_id)
      )
  );
$$;

-- ============================================================
-- 3. Additive Permissive Policies for coach_id-based tables
-- ============================================================

-- ── profiles ──
CREATE POLICY "Team members can view athlete profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_active_team_member_of(coach_id));

CREATE POLICY "Team members can update athlete profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_active_team_member_of(coach_id));

-- ── programs ──
CREATE POLICY "Team members can view programs"
  ON public.programs FOR SELECT TO authenticated
  USING (public.is_active_team_member_of(coach_id));

CREATE POLICY "Team members can insert programs"
  ON public.programs FOR INSERT TO authenticated
  WITH CHECK (public.is_active_team_member_of(coach_id));

CREATE POLICY "Team members can update programs"
  ON public.programs FOR UPDATE TO authenticated
  USING (public.is_active_team_member_of(coach_id));

CREATE POLICY "Team members can delete programs"
  ON public.programs FOR DELETE TO authenticated
  USING (public.is_active_team_member_of(coach_id));

-- ── exercises (JOIN-based via programs) ──
CREATE POLICY "Team members can view exercises"
  ON public.exercises FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.programs
    WHERE programs.id = exercises.program_id
      AND public.is_active_team_member_of(programs.coach_id)
  ));

CREATE POLICY "Team members can insert exercises"
  ON public.exercises FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.programs
    WHERE programs.id = exercises.program_id
      AND public.is_active_team_member_of(programs.coach_id)
  ));

CREATE POLICY "Team members can update exercises"
  ON public.exercises FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.programs
    WHERE programs.id = exercises.program_id
      AND public.is_active_team_member_of(programs.coach_id)
  ));

CREATE POLICY "Team members can delete exercises"
  ON public.exercises FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.programs
    WHERE programs.id = exercises.program_id
      AND public.is_active_team_member_of(programs.coach_id)
  ));

-- ── assigned_workouts ──
CREATE POLICY "Team members can view assigned workouts"
  ON public.assigned_workouts FOR SELECT TO authenticated
  USING (public.is_active_team_member_of(coach_id));

CREATE POLICY "Team members can insert assigned workouts"
  ON public.assigned_workouts FOR INSERT TO authenticated
  WITH CHECK (public.is_active_team_member_of(coach_id));

CREATE POLICY "Team members can update assigned workouts"
  ON public.assigned_workouts FOR UPDATE TO authenticated
  USING (public.is_active_team_member_of(coach_id));

CREATE POLICY "Team members can delete assigned workouts"
  ON public.assigned_workouts FOR DELETE TO authenticated
  USING (public.is_active_team_member_of(coach_id));

-- ── payments ──
CREATE POLICY "Team members can view payments"
  ON public.payments FOR SELECT TO authenticated
  USING (public.is_active_team_member_of(coach_id));

CREATE POLICY "Team members can insert payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.is_active_team_member_of(coach_id));

CREATE POLICY "Team members can update payments"
  ON public.payments FOR UPDATE TO authenticated
  USING (public.is_active_team_member_of(coach_id));

CREATE POLICY "Team members can delete payments"
  ON public.payments FOR DELETE TO authenticated
  USING (public.is_active_team_member_of(coach_id));

-- ── ai_weekly_analyses ──
CREATE POLICY "Team members can view analyses"
  ON public.ai_weekly_analyses FOR SELECT TO authenticated
  USING (public.is_active_team_member_of(coach_id));

CREATE POLICY "Team members can insert analyses"
  ON public.ai_weekly_analyses FOR INSERT TO authenticated
  WITH CHECK (public.is_active_team_member_of(coach_id));

CREATE POLICY "Team members can update analyses"
  ON public.ai_weekly_analyses FOR UPDATE TO authenticated
  USING (public.is_active_team_member_of(coach_id));

CREATE POLICY "Team members can delete analyses"
  ON public.ai_weekly_analyses FOR DELETE TO authenticated
  USING (public.is_active_team_member_of(coach_id));

-- ── assigned_supplements ──
CREATE POLICY "Team members can manage supplements"
  ON public.assigned_supplements FOR ALL TO authenticated
  USING (public.is_active_team_member_of(coach_id))
  WITH CHECK (public.is_active_team_member_of(coach_id));

-- ── nutrition_targets ──
CREATE POLICY "Team members can manage nutrition targets"
  ON public.nutrition_targets FOR ALL TO authenticated
  USING (public.is_active_team_member_of(coach_id))
  WITH CHECK (public.is_active_team_member_of(coach_id));

-- ── diet_templates ──
CREATE POLICY "Team members can manage diet templates"
  ON public.diet_templates FOR ALL TO authenticated
  USING (public.is_active_team_member_of(coach_id))
  WITH CHECK (public.is_active_team_member_of(coach_id));

-- ── diet_template_foods (JOIN-based via diet_templates) ──
CREATE POLICY "Team members can manage diet template foods"
  ON public.diet_template_foods FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.diet_templates
    WHERE diet_templates.id = diet_template_foods.template_id
      AND public.is_active_team_member_of(diet_templates.coach_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.diet_templates
    WHERE diet_templates.id = diet_template_foods.template_id
      AND public.is_active_team_member_of(diet_templates.coach_id)
  ));

-- ── athlete_diet_assignments ──
CREATE POLICY "Team members can manage diet assignments"
  ON public.athlete_diet_assignments FOR ALL TO authenticated
  USING (public.is_active_team_member_of(coach_id))
  WITH CHECK (public.is_active_team_member_of(coach_id));

-- ── program_assignment_logs ──
CREATE POLICY "Team members can manage assignment logs"
  ON public.program_assignment_logs FOR ALL TO authenticated
  USING (public.is_active_team_member_of(coach_id))
  WITH CHECK (public.is_active_team_member_of(coach_id));

-- ── mutation_logs ──
CREATE POLICY "Team members can view mutation logs"
  ON public.mutation_logs FOR SELECT TO authenticated
  USING (public.is_active_team_member_of(coach_id));

CREATE POLICY "Team members can insert mutation logs"
  ON public.mutation_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_active_team_member_of(coach_id));

-- ── food_items (SELECT already open to all authenticated) ──
CREATE POLICY "Team members can manage food items"
  ON public.food_items FOR ALL TO authenticated
  USING (public.is_active_team_member_of(coach_id))
  WITH CHECK (public.is_active_team_member_of(coach_id));
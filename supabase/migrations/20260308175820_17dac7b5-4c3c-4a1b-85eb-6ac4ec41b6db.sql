-- RLS for programs: coaches can CRUD their own programs
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view own programs"
ON public.programs FOR SELECT TO authenticated
USING (coach_id = auth.uid());

CREATE POLICY "Coaches can insert own programs"
ON public.programs FOR INSERT TO authenticated
WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches can update own programs"
ON public.programs FOR UPDATE TO authenticated
USING (coach_id = auth.uid());

CREATE POLICY "Coaches can delete own programs"
ON public.programs FOR DELETE TO authenticated
USING (coach_id = auth.uid());

-- RLS for exercises: coaches can CRUD exercises belonging to their programs
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view exercises of own programs"
ON public.exercises FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.programs WHERE programs.id = exercises.program_id AND programs.coach_id = auth.uid()
));

CREATE POLICY "Coaches can insert exercises to own programs"
ON public.exercises FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.programs WHERE programs.id = exercises.program_id AND programs.coach_id = auth.uid()
));

CREATE POLICY "Coaches can update exercises of own programs"
ON public.exercises FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.programs WHERE programs.id = exercises.program_id AND programs.coach_id = auth.uid()
));

CREATE POLICY "Coaches can delete exercises of own programs"
ON public.exercises FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.programs WHERE programs.id = exercises.program_id AND programs.coach_id = auth.uid()
));
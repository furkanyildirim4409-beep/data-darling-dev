ALTER TABLE public.profiles
ADD COLUMN active_program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL;
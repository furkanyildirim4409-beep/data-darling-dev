ALTER TABLE public.assigned_workouts ADD COLUMN IF NOT EXISTS spotify_url TEXT;
ALTER TABLE public.workout_templates ADD COLUMN IF NOT EXISTS spotify_url TEXT;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS spotify_url TEXT;
ALTER TABLE public.nutrition_targets
  ADD COLUMN IF NOT EXISTS diet_start_date date,
  ADD COLUMN IF NOT EXISTS diet_duration_weeks integer;
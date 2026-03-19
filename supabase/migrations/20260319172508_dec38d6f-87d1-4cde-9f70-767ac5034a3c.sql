-- Composite index for nutrition_logs (user_id + logged_at range queries)
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_date 
ON public.nutrition_logs(user_id, logged_at DESC);

-- Composite index for consumed_foods (athlete_id + logged_at range queries)
CREATE INDEX IF NOT EXISTS idx_consumed_foods_athlete_date 
ON public.consumed_foods(athlete_id, logged_at DESC);

-- Composite index for body_measurements (user_id + logged_at order queries)
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date 
ON public.body_measurements(user_id, logged_at DESC);

-- Composite index for workout_logs (dashboard/action stream queries)
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date 
ON public.workout_logs(user_id, logged_at DESC);
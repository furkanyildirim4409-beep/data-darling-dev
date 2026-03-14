
-- Add assignment_batch_id to both tables
ALTER TABLE public.assigned_workouts ADD COLUMN IF NOT EXISTS assignment_batch_id uuid;
ALTER TABLE public.program_assignment_logs ADD COLUMN IF NOT EXISTS assignment_batch_id uuid;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assigned_workouts_batch ON public.assigned_workouts (assignment_batch_id);
CREATE INDEX IF NOT EXISTS idx_assigned_workouts_athlete_program_date ON public.assigned_workouts (athlete_id, program_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_program_assignment_logs_athlete_date ON public.program_assignment_logs (athlete_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_program_assignment_logs_batch ON public.program_assignment_logs (assignment_batch_id);


-- Add RIR and failure_set to exercises table
ALTER TABLE public.exercises 
  ADD COLUMN IF NOT EXISTS rir integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS failure_set boolean DEFAULT false;

-- Add automation_rules and week_config to programs table
-- week_config stores per-day: label, blockType, groups (superset/circuit)
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS automation_rules jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS week_config jsonb DEFAULT '[]'::jsonb;

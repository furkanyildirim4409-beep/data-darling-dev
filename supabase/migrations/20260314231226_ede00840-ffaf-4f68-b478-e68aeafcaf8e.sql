
-- Add actions and resolved columns to ai_weekly_analyses
ALTER TABLE public.ai_weekly_analyses
  ADD COLUMN IF NOT EXISTS actions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS resolved boolean DEFAULT false;

-- Add UPDATE RLS policy so coaches can mark resolved = true
CREATE POLICY "Coaches can update own analyses"
  ON public.ai_weekly_analyses
  FOR UPDATE
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

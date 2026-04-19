ALTER TABLE public.coach_stories
  ADD COLUMN IF NOT EXISTS is_highlighted boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_coach_stories_highlighted
  ON public.coach_stories(coach_id, is_highlighted);
ALTER TABLE public.coach_highlight_metadata
  ADD COLUMN IF NOT EXISTS show_on_profile boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_chm_coach_show_profile
  ON public.coach_highlight_metadata (coach_id, show_on_profile);
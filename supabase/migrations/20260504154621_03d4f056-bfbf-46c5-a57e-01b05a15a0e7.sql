ALTER TABLE public.coach_highlight_metadata
  ADD COLUMN IF NOT EXISTS is_pinned_to_kokpit boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_chm_coach_pinned
  ON public.coach_highlight_metadata (coach_id, is_pinned_to_kokpit);
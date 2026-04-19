CREATE TABLE public.coach_highlight_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_name text NOT NULL,
  custom_cover_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coach_id, category_name)
);

ALTER TABLE public.coach_highlight_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own highlight metadata"
  ON public.coach_highlight_metadata FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

CREATE INDEX idx_chm_coach ON public.coach_highlight_metadata(coach_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_chm_updated_at
  BEFORE UPDATE ON public.coach_highlight_metadata
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();
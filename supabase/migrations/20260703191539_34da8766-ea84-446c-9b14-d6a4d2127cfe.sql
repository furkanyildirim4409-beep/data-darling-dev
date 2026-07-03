
ALTER TABLE public.exercise_library
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS image_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS image_sync_error TEXT;

CREATE INDEX IF NOT EXISTS idx_exercise_library_image_pending
  ON public.exercise_library (name)
  WHERE image_synced_at IS NULL;

CREATE OR REPLACE FUNCTION public.unschedule_backfill_exercise_images()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  PERFORM cron.unschedule('backfill-exercise-images')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'backfill-exercise-images');
END;
$$;

REVOKE ALL ON FUNCTION public.unschedule_backfill_exercise_images() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unschedule_backfill_exercise_images() TO service_role;

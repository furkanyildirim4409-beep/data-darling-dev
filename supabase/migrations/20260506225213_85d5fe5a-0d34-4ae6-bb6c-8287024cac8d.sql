ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS scheduled_at timestamptz, ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';
UPDATE public.social_posts SET status = 'published' WHERE status IS NULL;
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON public.social_posts (status, scheduled_at) WHERE status = 'scheduled';
DROP POLICY IF EXISTS "Herkes postları görebilir" ON public.social_posts;
CREATE POLICY "Public can view published posts" ON public.social_posts FOR SELECT USING (status = 'published');
CREATE POLICY "Coaches can view own posts" ON public.social_posts FOR SELECT USING (auth.uid() = coach_id);
CREATE OR REPLACE FUNCTION public.publish_due_social_posts() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.social_posts SET status = 'published', scheduled_at = NULL WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
DO $do$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'publish-due-social-posts') THEN
    PERFORM cron.unschedule('publish-due-social-posts');
  END IF;
  PERFORM cron.schedule('publish-due-social-posts', '* * * * *', 'SELECT public.publish_due_social_posts();');
END $do$;
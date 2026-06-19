
-- Restrict post_likes SELECT to authenticated users only
DROP POLICY IF EXISTS "Herkes beğenileri görebilir" ON public.post_likes;

-- Tighten realtime.messages SELECT to remove postgres_changes bypass
DROP POLICY IF EXISTS "Users can read their own realtime topics" ON realtime.messages;
CREATE POLICY "Users can read their own realtime topics"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (realtime.topic() LIKE ('user:' || auth.uid()::text || '%'));

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_messages_metadata_story
  ON public.messages ((metadata->>'story_id'))
  WHERE metadata ? 'story_id';
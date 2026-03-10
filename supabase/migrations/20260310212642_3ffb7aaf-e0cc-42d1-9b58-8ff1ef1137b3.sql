-- Add media columns to messages table
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS media_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS media_type text DEFAULT NULL;

-- Create chat-media storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload to chat-media
CREATE POLICY "Authenticated users can upload chat media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-media');

-- RLS: anyone can read chat media (public bucket)
CREATE POLICY "Public read access for chat media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'chat-media');

-- RLS: users can delete their own uploads
CREATE POLICY "Users can delete own chat media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);
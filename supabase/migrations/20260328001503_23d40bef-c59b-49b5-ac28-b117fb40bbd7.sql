ALTER TABLE public.academy_content
  ADD COLUMN IF NOT EXISTS modules jsonb NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO storage.buckets (id, name, public) VALUES ('academy-videos', 'academy-videos', true);

CREATE POLICY "Coaches upload academy videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'academy-videos');

CREATE POLICY "Anyone can view academy videos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'academy-videos');

CREATE POLICY "Coaches delete own academy videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'academy-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
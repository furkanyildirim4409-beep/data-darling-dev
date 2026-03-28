INSERT INTO storage.buckets (id, name, public) VALUES ('academy-thumbnails', 'academy-thumbnails', true);

CREATE POLICY "Coaches upload academy thumbnails"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'academy-thumbnails');

CREATE POLICY "Anyone can view academy thumbnails"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'academy-thumbnails');

CREATE POLICY "Coaches delete own academy thumbnails"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'academy-thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);
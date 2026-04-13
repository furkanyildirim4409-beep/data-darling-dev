INSERT INTO storage.buckets (id, name, public) VALUES ('social-media', 'social-media', true);

CREATE POLICY "Authenticated users can upload social media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'social-media');

CREATE POLICY "Public read access for social media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'social-media');

CREATE POLICY "Users can delete own social media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'social-media' AND (storage.foldername(name))[1] = auth.uid()::text);
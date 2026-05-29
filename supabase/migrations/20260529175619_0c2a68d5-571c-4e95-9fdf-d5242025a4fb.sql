INSERT INTO storage.buckets (id, name, public)
VALUES ('coaching-packages', 'coaching-packages', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Coaches can upload assets into coaching-packages" ON storage.objects;
DROP POLICY IF EXISTS "Public read visibility for coaching-packages" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can update coaching-packages assets" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can delete coaching-packages assets" ON storage.objects;

CREATE POLICY "Coaches can upload assets into coaching-packages"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'coaching-packages');

CREATE POLICY "Public read visibility for coaching-packages"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'coaching-packages');

CREATE POLICY "Coaches can update coaching-packages assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'coaching-packages')
WITH CHECK (bucket_id = 'coaching-packages');

CREATE POLICY "Coaches can delete coaching-packages assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'coaching-packages');
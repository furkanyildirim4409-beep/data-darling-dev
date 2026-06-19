
-- 1) digital-products bucket: enforce folder-owner check
DROP POLICY IF EXISTS "Auth Insert Digital Products" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update Digital Products" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete Digital Products" ON storage.objects;

CREATE POLICY "Auth Insert Digital Products"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'digital-products'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Auth Update Digital Products"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'digital-products'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'digital-products'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Auth Delete Digital Products"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'digital-products'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2) coaching-packages bucket: enforce folder-owner check on update/delete (insert already similar)
DROP POLICY IF EXISTS "Coaches can update coaching-packages assets" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can delete coaching-packages assets" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can upload assets into coaching-packages" ON storage.objects;

CREATE POLICY "Coaches can upload assets into coaching-packages"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'coaching-packages'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Coaches can update coaching-packages assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'coaching-packages'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'coaching-packages'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Coaches can delete coaching-packages assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'coaching-packages'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3) Realtime: remove blanket `true` policies and replace with topic-scoped rules.
--    Channel naming convention used by the app: any user-specific topic must start with `user:<auth.uid()>`
--    (e.g. `user:<uuid>:messages`). Public `postgres_changes` on tables still respects the underlying
--    table RLS — we no longer override it here.
DROP POLICY IF EXISTS "authenticated_realtime_access" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated_realtime_broadcast" ON realtime.messages;

CREATE POLICY "Users can read their own realtime topics"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    realtime.topic() LIKE ('user:' || auth.uid()::text || '%')
    OR extension = 'postgres_changes'
  );

CREATE POLICY "Users can broadcast only on their own topics"
  ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (
    realtime.topic() LIKE ('user:' || auth.uid()::text || '%')
  );

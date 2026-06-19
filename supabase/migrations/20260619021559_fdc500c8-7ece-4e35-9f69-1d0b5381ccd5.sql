
ALTER POLICY "Users can update own profile" ON public.profiles TO authenticated;
ALTER POLICY "Coaches can update athlete profiles" ON public.profiles TO authenticated;
ALTER POLICY "Team members can update athlete profiles" ON public.profiles TO authenticated;
ALTER POLICY "Athletes update own assignment music" ON public.assigned_workouts TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can upload challenge proofs" ON storage.objects;
CREATE POLICY "Authenticated users can upload challenge proofs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'challenge-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated users can upload social media" ON storage.objects;
CREATE POLICY "Authenticated users can upload social media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'social-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can view their created tokens" ON public.auto_login_tokens;
CREATE POLICY "Users can view their created tokens"
  ON public.auto_login_tokens FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    AND used_at IS NULL
    AND expires_at > now()
  );

ALTER TABLE public.coach_products
  ADD COLUMN IF NOT EXISTS shopify_product_id text,
  ADD COLUMN IF NOT EXISTS shopify_variant_id text,
  ADD COLUMN IF NOT EXISTS category text;

CREATE INDEX IF NOT EXISTS idx_coach_products_coach_active
  ON public.coach_products(coach_id, is_active);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Coaches upload to own products folder'
  ) THEN
    CREATE POLICY "Coaches upload to own products folder"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'products'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Coaches update own products folder'
  ) THEN
    CREATE POLICY "Coaches update own products folder"
      ON storage.objects FOR UPDATE TO authenticated
      USING (
        bucket_id = 'products'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Coaches delete own products folder'
  ) THEN
    CREATE POLICY "Coaches delete own products folder"
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'products'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read products bucket'
  ) THEN
    CREATE POLICY "Public read products bucket"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'products');
  END IF;
END $$;
DROP POLICY IF EXISTS "Buyers and owning coach can read digital-products" ON storage.objects;

CREATE POLICY "Buyers and owning coach can read digital-products"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'digital-products'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.orders o
      JOIN public.coach_products cp
        ON cp.digital_file_url = storage.objects.name
      WHERE o.user_id = auth.uid()
        AND o.status = ANY (ARRAY['paid','completed','delivered','processing','shipped'])
        AND o.items::text LIKE '%' || cp.id::text || '%'
    )
  )
);
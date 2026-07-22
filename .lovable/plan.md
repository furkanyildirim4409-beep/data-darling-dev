# Digital Products Download Güvenlik Açığı Kapatma Planı

## Amaç
"Paid digital products can be downloaded by anyone" açığını kapatmak. Sadece 2 DB değişikliği; hiçbir frontend/UI dosyasına dokunulmayacak.

## Değişiklikler

### 1. `digital-products` bucket'ını private yap
`supabase--storage_update_bucket` aracıyla:
- `name: "digital-products"`, `public: false`

### 2. Storage RLS policy'sini düzelt
Migration ile `storage.objects` üzerindeki mevcut hatalı SELECT policy'yi drop edip yeniden oluştur:

```sql
DROP POLICY IF EXISTS "Buyers and owning coach can read digital-products"
  ON storage.objects;

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
```

## Etki Analizi
- **Mobil (öğrenci) app**: zaten `createSignedUrl` kullanıyor → private bucket'ta çalışmaya devam eder; alıcı artık policy'nin `EXISTS` koluyla eşleşeceği için indirmeler gerçekten yetkilendirilmiş olur.
- **Koç paneli**: `digital-products`'a sadece upload yapıyor, `getPublicUrl` okuyucusu yok → bozulma yok. Sahibi (path'in ilk klasörü = `auth.uid()`) kendi yüklediği dosyaya erişebilir.
- **Admin**: `has_role` ile tam erişim.
- **Yetkisiz kullanıcı**: private bucket + eşleşmeyen policy → 403.

## Doğrulama
- `supabase--linter` çalıştırılıp yeni uyarı olmadığı kontrol edilecek.
- Bucket'ın `public=false` olduğu `supabase--read_query` ile teyit edilecek.

## Frontend
Dokunulmayacak.

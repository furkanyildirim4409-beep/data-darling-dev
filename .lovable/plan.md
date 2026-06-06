# Plan — "Bucket not found" Dijital Ürün Yükleme Hatasını Çözme

## Teşhis

Mevcut storage bucket listesini doğruladım — projedeki bucket'lar şunlar:
`avatars, blood-test-pdfs, Hareket, challenge-proofs, academy-thumbnails, academy-videos, progress-photos, chat-media, social-media, products, review-images, coaching-packages`

**`digital-products` bucket'ı YOK.** 

`StoreManager.tsx` içindeki dropzone uploader `supabase.storage.from('digital-products').upload(...)` çağrısı yapıyor. Bucket var olmadığı için Supabase Storage API "Bucket not found" hatası döndürüyor — tam olarak ekranda gördüğünüz toast bu.

Part 2/3 implementasyonu sırasında bucket oluşturma migration'ı hazırlanmıştı ancak (önceki turn'de gönderilen `INSERT INTO storage.buckets`) onaylanıp çalışmamış veya silinmiş. Bu yüzden bucket eksik kaldı.

## Çözüm

Eksik özel (private) `digital-products` bucket'ını ve uygun RLS politikalarını tek bir migration ile oluşturmak.

### Migration İçeriği

1. **Bucket oluştur** (private, 50MB limit, sadece PDF + ZIP MIME):
   - `id = 'digital-products'`
   - `public = false`
   - `file_size_limit = 52428800` (50MB)
   - `allowed_mime_types = ['application/pdf', 'application/zip', 'application/x-zip-compressed', 'application/octet-stream']`

2. **`storage.objects` üzerinde RLS politikaları**:
   - **INSERT** — Coach yalnızca kendi `coach_id` klasörüne yükleyebilir: `bucket_id = 'digital-products' AND (storage.foldername(name))[1] = auth.uid()::text`
   - **SELECT** — Coach yalnızca kendi klasöründeki dosyaları görebilir; ek olarak admin (`has_role(auth.uid(), 'admin')`) tüm dosyaları okuyabilir
   - **UPDATE / DELETE** — Coach yalnızca kendi klasöründeki dosyaları yönetebilir

## Test Planı (Build Sonrası)

1. Migration onaylandıktan sonra `storage.buckets` tablosunda `digital-products` satırının oluştuğunu `supabase--read_query` ile doğrula
2. Preview'da `/store` rotasında **"Yayınla ve Onaya Gönder"** akışına gir, "Dijital Program & E-Kitap" kategorisini seç, dropzone'a ZIP yükle
3. Network sekmesinde `storage/v1/object/digital-products/...` PUT isteğinin **200** döndüğünü doğrula
4. `coach_products` tablosunda `digital_file_url` alanının dolduğunu `supabase--read_query` ile kontrol et

## Kapsam Dışı

- `StoreManager.tsx`, `useStoreMutations.ts`, `create-shopify-product` edge function — kod tarafı zaten Part 2/3'te doğru implement edilmiş, dokunulmayacak
- Mevcut diğer bucket'lar veya policy'ler

Onaylarsanız migration'ı oluşturup uygulamaya geçeceğim.

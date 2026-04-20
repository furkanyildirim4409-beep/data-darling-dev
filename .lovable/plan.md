
## Bulgular

- `create-shopify-product` edge function şu anda Shopify Admin API `2025-07` kullanıyor ve `X-Shopify-Access-Token` header’ı doğru şekilde gönderiliyor.
- Kod tarafındaki 3 adımlı akış da doğru görünüyor: `productCreate` → `productVariantsBulkUpdate` → `productCreateMedia`.
- Hata doğrudan Shopify’dan geliyor: `ACCESS_DENIED` ve açıkça `write_products` scope + ürün oluşturma yetkisi eksik olduğunu söylüyor.
- Mevcut fonksiyon hâlâ manuel secret’lara bağlı: `SHOPIFY_DOMAIN` ve `SHOPIFY_ADMIN_TOKEN`.
- Shopify yetki durumu bu kullanıcı için `AUTHORIZED - Per-User Access`; yani Lovable tarafında bağlantı var, fakat ürün oluşturma izni mağaza tarafındaki rol/credential kaynağında eksik olabilir.

## Kök Neden

Sorun mutation yapısından çok yetki kaynağında:

1. Edge function, Lovable Shopify bağlantısından bağımsız/stale kalmış bir `SHOPIFY_ADMIN_TOKEN` kullanıyor olabilir.
2. Token’da `write_products` scope olmayabilir.
3. Token doğru olsa bile, bağlı Shopify kullanıcısının mağaza içinde “product create/edit” yetkisi olmayabilir.
4. Bu yüzden `productCreate` ilk adımda düşüyor ve tüm akış 500’e dönüyor.

## Uygulama Planı

### 1) Shopify credential kaynağını netleştir
- Projedeki aktif Shopify bağlantısını ve secret kaynağını kontrol edeceğim.
- `SHOPIFY_DOMAIN` / `SHOPIFY_ADMIN_TOKEN` gerçekten güncel mi, yoksa Lovable Shopify bağlantısından kopuk eski bir token mı, bunu doğrulayacağım.
- Gerekirse bu projedeki edge function’ı Lovable bağlantısıyla uyumlu secret kaynağına taşıyacağım veya güncel token/domain ile yeniden bağlayacağım.

### 2) Yetki problemini düzelt
- Shopify bağlantısında `write_products` scope’un gerçekten bulunduğunu doğrulayacağım.
- Eğer scope eksikse bağlantıyı doğru scope’larla yeniden yetkilendireceğim.
- Eğer scope var ama kullanıcı rolü yetersizse, mağaza tarafında ürün oluşturma yetkisi olan hesapla yeniden authorize edilmesi gerekecek; bunu tespit edip net hata mesajı üreteceğim.

### 3) Edge function’ı sertleştir
`supabase/functions/create-shopify-product/index.ts` içinde:

- mevcut 3 adımlı 2025-07 akış korunacak
- `ACCESS_DENIED` hataları artık generic 500 yerine anlamlı biçimde ayrıştırılacak
- response daha net olacak:
  - `403`: scope/Shopify role yetkisi sorunu
  - `500`: gerçek sunucu veya beklenmeyen Shopify hatası
- log’larda token’ın kendisi asla yazılmayacak; sadece:
  - hangi domain’e gidildiği
  - hangi mutation’ın fail ettiği
  - Shopify `code` / `requiredAccess` alanları
- böylece bir sonraki hata doğrudan “scope eksik” mi, “staff permission eksik” mi, “yanlış token” mı anlaşılacak

### 4) Frontend hata mesajını iyileştir
`src/hooks/useStoreMutations.ts` içinde:

- edge function’dan gelen `403 ACCESS_DENIED` durumunu özel yakalayacağım
- kullanıcıya genel “500” yerine açık mesaj göstereceğim:
  - `Shopify ürün oluşturma yetkisi eksik`
  - `write_products scope veya mağaza kullanıcı izni gerekiyor`
- rollback davranışı korunacak; Shopify başarısızsa storage yüklemesi temizlenecek

### 5) Uçtan uca doğrulama
Düzeltmeden sonra gerçek test akışı:

1. `/store` üzerinden ürün oluştur
2. Shopify Admin’de ürün oluştuğunu doğrula
3. fiyatın default variant’a işlendiğini doğrula
4. görselin bağlandığını doğrula
5. `coach_products` tablosuna `shopify_product_id` ve `shopify_variant_id` yazıldığını doğrula

## Teknik Notlar

- Veritabanı migration gerekmiyor.
- Ana kod bug’ı şu anda GraphQL şeması değil, authorization zinciri.
- `productCreate` ilk mutation’da fail ettiği için fiyat ve medya adımlarına zaten geçilemiyor.
- En kritik düzeltme: edge function’ın doğru, güncel ve ürün oluşturma yetkili Shopify credential ile çalıştığından emin olmak.

## Uygulanacak Dosyalar

- `supabase/functions/create-shopify-product/index.ts`
- `src/hooks/useStoreMutations.ts`

## Beklenen Sonuç

Bu çalışma sonunda ürün oluşturma akışı ya:
- başarılı şekilde Shopify’a ürün açacak,
- ya da başarısız olursa artık net olarak “scope eksik”, “Shopify staff yetkisi eksik” veya “yanlış/stale token” diye ayrıştırılmış hata verecek.


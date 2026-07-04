## Sorunun Kaynağı

Aynı sipariş için iki farklı numara üretiliyor:

| Yer | Formül | Örnek |
|---|---|---|
| Koç Paneli (`StoreOrdersList`, `OrderFulfillmentSheet`, `PackingSlip`) | UUID'nin ilk 4 karakteri, büyük harf | `#ORD-6527` |
| Öğrenci App | UUID'nin ilk 8 karakteri | `65272568` |
| Shopify Admin | Shopify'ın gerçek `order_number` alanı | örn. `#1042` |

DB'de sipariş `65272568-e7b6-...` gerçek bir Shopify siparişi:
- `order_type = shopify`
- `external_reference_id = gid://shopify/Order/6653977362621`
- `items[0]` içinde zaten `title`, `image`, `price`, `shopifyVariantId`, `productId` var

Yani veri Shopify'dan geliyor ama **hiçbir yerde Shopify'ın kendi `order_number` / `order_status_url`'ı saklanmıyor**. UI'lar UUID'den türetiyor, bu yüzden iki app iki farklı sonuç gösteriyor.

## Plan

### 1) Sipariş numarasını Shopify'a hizala (tek doğru kaynak)

**DB migration**
- `orders` tablosuna iki kolon ekle:
  - `shopify_order_number TEXT` (örn. `1042`)
  - `shopify_order_status_url TEXT` (Shopify'ın müşteriye özel sipariş takip URL'i)
- Mevcut Shopify siparişlerini backfill için (opsiyonel) bir edge function: `external_reference_id` üzerinden Shopify Admin API'yi çağırıp `order_number` + `order_status_url` çeker, DB'ye yazar.

**Shopify webhook (`shopify-webhook`)**
- `orders/create` / `orders/paid` / `orders/updated` topic'inde geleceğin siparişleri için payload'daki `payload.order_number` ve `payload.order_status_url` alanlarını `orders` tablosuna kaydet (upsert `external_reference_id` üzerinden).

**Koç Paneli (bu repo)**
- `StoreOrdersList.tsx`, `OrderFulfillmentSheet.tsx`, `PackingSlipPrintView.tsx` içindeki `#ORD-` türetimini kaldır. Yerine:
  - `shopify_order_number` varsa → `#${shopify_order_number}`
  - Yoksa (in-app koçluk siparişi) → mevcut `#ORD-XXXX` fallback

### 2) `{{items_description}}` için gerçek Shopify verisi (görsel + açıklama)

**`order_receipt` email şablonu (`supabase/functions/_shared/email-templates/order-receipt.ts`)**
- `items_description` string'inin oluşturulduğu yeri güncelle. Her `line_item` için:
  - Ürün görseli (`<img src="{cdn.shopify.com/...}" width="80">`)
  - Başlık, adet, birim fiyat, ara toplam
  - Kısa açıklama (Shopify `product.body_html`'in stripped versiyonu, max ~200 char)
- Görsel + açıklama zaten webhook payload'unda gelmiyorsa (özellikle description), send-email içinde Shopify Admin API'den `products/{id}.json` çağır, cache'le, template'e paslar.
- Karanlık Dynabolic Elite temasına sadık kart layout (mevcut inline CSS token'ları korunur).

**`shopify-webhook/handleOrder`**
- Her `line_item`'a `image_url` ve `description` alanları eklenir (payload'dan + gerekiyorsa Admin API lookup) ve `callSendEmail` payload'una konur.

### 3) `orderUrl` → gerçek sipariş linki (mock kaldırılıyor)

**Kaynak öncelik sırası:**
1. `orders.shopify_order_status_url` (Shopify müşteri takip sayfası — auth gerektirmez, en iyi UX)
2. Fallback: `https://app.dynabolic.co/orders/{orderId}` (öğrenci app içindeki sipariş detay sayfası)

**send-email:**
- `data.ctaUrl` yoksa yukarıdaki iki adımı sırayla dener, template'e `{{orderUrl}}` olarak paslar.

### 4) Öğrenci App için Prompt (ayrı repo — bu projede editlenemez)

Öğrenci app aynı Supabase projesine bağlı. Şu prompt'u öğrenci app projesinde çalıştırman gerekli:

> Sipariş numarası gösterimini birleştir: `orders` tablosundaki yeni `shopify_order_number` kolonu doluysa `#${shopify_order_number}` göster; boşsa fallback olarak `#ORD-${id.replace(/-/g,'').slice(0,4).toUpperCase()}` göster. Şu anda kullanılan `id.slice(0,8)` türetimini tamamen kaldır — koç paneli ile tutarsızlığa yol açıyor.
>
> Ayrıca `/orders/:id` route'unda bir sipariş detay sayfası oluştur: `orders` satırını çek, `items` array'inden ürünleri (image, title, quantity, price) grid olarak listele, `shopify_order_status_url` varsa "Shopify'da Takip Et" butonu göster. Bu sayfa e-mail'lerdeki `{{orderUrl}}` fallback linki için hedef olacak.

### Teknik Notlar

- Shopify Admin API çağrıları için `SHOPIFY_ADMIN_ACCESS_TOKEN` + `SHOPIFY_STORE_DOMAIN` gerekli — `_shared/shopify-admin.ts` zaten var, tekrar kullanılacak.
- Backfill sırasında rate-limit için 500ms delay.
- `dev-trigger-email`'i test için tutabilirim veya silebilirim (senin tercihin).
- Test siparişi (`65272568-...`) backfill sonrası gerçek Shopify numarasını alacak; email'i tekrar tetikleyip doğrulayabiliriz.

### Onayından Sonra Sıra

1. Migration + backfill function
2. `shopify-webhook` güncelleme
3. `order-receipt.ts` template'i zengin item kartlarıyla yeniden yaz
4. Koç panelindeki 3 dosyada `#ORD-` fallback'ı akıllı hale getir
5. Test siparişini yeniden gönder, sonuçları doğrula

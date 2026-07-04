# Shopify → Dynabolic Custom Email Pipeline

## Amaç
Shopify'ın varsayılan mail sistemi devre dışı bırakılıp; `orders/create`, `orders/paid`, `fulfillments/create`, `fulfillments/update` webhook'ları Supabase Edge Function'a düşecek. Marka temalı HTML mailler Resend üzerinden gönderilecek.

## Mevcut Durum (keşif)
- `supabase/functions/send-email` zaten `order_receipt` tipini destekliyor (React Email + Resend). Ancak `_shared/email-templates/order-receipt.tsx` **placeholder** — HTML tasarımı henüz gelmedi.
- Kargo maili için ne template ne de tip mevcut.
- `handle-universal-orders` maili **iç `orders` tablosu** status değişimlerinden tetikliyor — Shopify webhook değil. Shopify webhook uç noktası projede yok.

## Yapılacaklar

### 1. Yeni React Email şablonları (placeholder olarak eklenecek, HTML'i sen yapıştıracaksın)
- `supabase/functions/_shared/email-templates/order-receipt.tsx` — mevcut placeholder korunur; yeni gelen HTML buraya işlenir. Propları: `recipientName, orderRef (orderId), itemsDescription, items[], subtotal, shipping, totalAmount, orderUrl`.
- `supabase/functions/_shared/email-templates/shipping-notification.tsx` — **yeni**. Propları: `recipientName, orderId, shippingCompany, trackingNumber, trackingUrl, orderUrl`.

### 2. `send-email` fonksiyonuna `shipping_notification` tipi
- Zod şeması + `renderEmail` switch dalı eklenir.
- `from`: `Dynabolic Lojistik <logistics@dynabolic.co>` (mevcut konvansiyonla uyumlu). Sipariş için `orders@dynabolic.co` mevcut kalır. `info@dynabolic.co` istersen bunu tek adres olarak da ayarlayabiliriz — aşağıda not.
- Subject şablonları:
  - Sipariş: `Sipariş #{orderId} onaylandı`
  - Kargo: `Siparişin yola çıktı — Takip #{trackingNumber}`

### 3. Yeni edge function: `shopify-webhook`
`supabase/functions/shopify-webhook/index.ts`

Sorumluluklar:
- HMAC doğrulaması: `X-Shopify-Hmac-Sha256` header'ı `SHOPIFY_WEBHOOK_SECRET` ile HMAC-SHA256 base64 üzerinden karşılaştırılır (raw body ile). Geçersizse `401`.
- Topic ayrımı: `X-Shopify-Topic` header'ı ile:
  - `orders/create` **veya** `orders/paid` → `order_receipt` maili
    - Payload'dan: `id → orderId`, `email → to`, `customer.first_name → recipientName`, `line_items[] → items[] + itemsDescription`, `subtotal_price, total_shipping_price_set, total_price → tutarlar`, `order_status_url → orderUrl`.
    - Idempotency: aynı `orderId` için iki maili engellemek üzere `emails` tablosunda `subject` + `to_email` üzerinden son 24 saatlik kayıt kontrolü.
  - `fulfillments/create` **veya** `fulfillments/update` → `shipping_notification` maili
    - Payload'dan: `order_id → orderId`, `tracking_company → shippingCompany`, `tracking_number → trackingNumber`, `tracking_url (veya tracking_urls[0]) → trackingUrl`. Alıcı e-posta ayrı sorguyla veya `email` alanından.
    - `status === 'success'` olan fulfillment'lar için gönderim yapılır. `update` çağrıldığında yalnızca yeni takip numarası varsa yeniden gönder.
- Gönderim: dahili `fetch` ile aynı Supabase projesindeki `send-email` fonksiyonuna `Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY` + `X-Webhook-Secret: CRON_SECRET` ile POST.
- `supabase/config.toml` içine `[functions.shopify-webhook] verify_jwt = false` eklenir (Shopify JWT göndermez).

### 4. Secrets
Aşağıdaki secret'lar eklenecek (senden isteyeceğim):
- `SHOPIFY_WEBHOOK_SECRET` — Shopify Admin → Notifications → Webhooks sayfasında görünen "Signing secret".

Zaten mevcut: `RESEND_DIRECT_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.

### 5. Shopify tarafı (senin yapman gereken)
- Admin → Settings → Notifications: Order confirmation, Order paid, Shipping confirmation, Shipping update mail şablonlarının içeriğini boşalt (veya minimalize et) — çift mail gitmesin.
- Admin → Settings → Notifications → Webhooks: 4 webhook oluştur, hedef URL:
  `https://fsbhbfltathfcpvcjfzt.supabase.co/functions/v1/shopify-webhook`
  Topics: `orders/create`, `orders/paid`, `fulfillments/create`, `fulfillments/update`. Format: JSON.

## Netleştirilmesi gereken tek konu
**Gönderici adresi:** Mesajda "info@dynabolic.co (veya sistem mailimiz)" dedin. Mevcut proje sipariş için `orders@dynabolic.co`, kargo için `logistics@dynabolic.co` kullanıyor ve `dynabolic.co` domain'i Resend'de doğrulanmış. Planı **mevcut ayrık adreslerle** ilerleteceğim; onaydan sonra farklı istersen tek satır değişiklik.

## Değişecek Dosyalar
- `supabase/functions/_shared/email-templates/order-receipt.tsx` (HTML yapıştırma bekliyor)
- `supabase/functions/_shared/email-templates/shipping-notification.tsx` (yeni)
- `supabase/functions/send-email/index.ts` (yeni tip)
- `supabase/functions/shopify-webhook/index.ts` (yeni)
- `supabase/config.toml` (yeni fonksiyon kaydı)

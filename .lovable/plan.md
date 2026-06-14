## Amaç

1. Stripe webhook'tan gelen tüm event'leri kalıcı bir geçmiş tablosunda tut.
2. `profiles.subscription_status` her event sonrası Stripe'taki gerçek durumla uyumlu kalsın (drift olursa otomatik düzelt).
3. Settings sayfasında kullanıcı kendi paketi ve durumunu okunabilir rozetlerle görsün.

---

## 1. Yeni tablo: `subscription_events`

Migration ile oluşturulacak. Her webhook çağrısında bir satır eklenir; idempotent (Stripe `event.id` PK olarak).

Kolonlar:
- `id` (text, PK) — Stripe event id (`evt_...`)
- `coach_id` (uuid, nullable) — profiles.id referansı
- `stripe_subscription_id` (text, nullable)
- `stripe_customer_id` (text, nullable)
- `event_type` (text) — örn. `customer.subscription.updated`
- `previous_status` / `new_status` (text, nullable)
- `previous_tier` / `new_tier` (text, nullable)
- `raw_payload` (jsonb) — debug için event objesi
- `created_at` (timestamptz)

Erişim:
- Sadece kullanıcının kendi `coach_id`'sine ait satırları okuyabilmesi
- INSERT yalnızca service_role (webhook) tarafından
- GRANT: `SELECT` authenticated, `ALL` service_role

## 2. Webhook senkronizasyon iyileştirmesi

`supabase/functions/stripe-subscription-webhook/index.ts` içinde:
- Her event başında `subscription_events`'e `INSERT ... ON CONFLICT (id) DO NOTHING` — aynı event iki kez gelirse no-op (Stripe retry koruması).
- `upsertFromSubscription` çağrısından önce profilin mevcut `subscription_status`/`subscription_tier` değerlerini çek, event satırına `previous_*` ve `new_*` alanlarını yaz.
- **Drift kontrolü**: Update sonrası Stripe'tan dönen `sub.status` ile DB'deki yeni değer karşılaştırılır; eşleşmiyorsa tekrar update + warning log. Bu, paralel webhook'larda son gelen Stripe state'i kazanır.
- `customer.subscription.deleted` event'inde `subscription_status = 'canceled'`, `subscription_tier = null` olarak normalize.

## 3. Settings sayfasında görünür rozetler

`src/pages/Settings.tsx` (mevcut satır 485 civarı, "Mevcut Paket" kısmı):
- Tier'i `subscriptionTiers.ts`'ten alınan label ile göster (örn. `pro` → "Pro").
- Status için renkli `Badge`: 
  - `active` / `trialing` → yeşil "Aktif"
  - `past_due` / `unpaid` → amber "Ödeme Bekliyor"
  - `canceled` / `incomplete_expired` → kırmızı "İptal"
  - diğerleri → nötr
- `subscription_current_period_end` doluysa "Bitiş: dd MMM yyyy" alt satırı.
- `subscription_cancel_at_period_end === true` ise "Dönem sonunda iptal olacak" notu.

Sadece görsel — yeni state veya iş mantığı eklenmez. Mevcut `profile` AuthContext'ten zaten geliyor.

---

## Teknik notlar

- Migration sırası: CREATE TABLE → GRANT → ENABLE RLS → POLICY.
- Webhook idempotency artık DB seviyesinde garantili (event.id unique).
- Frontend `types.ts` migration sonrası otomatik regenere olacak, ek tip değişikliği gerekmiyor.
- Mevcut `stripe_transactions` tablosu ödeme işlemleri için; `subscription_events` sadece abonelik yaşam döngüsü içindir — karıştırılmıyor.

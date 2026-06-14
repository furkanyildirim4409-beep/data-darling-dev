## 1. Stripe Drift Reconciliation Cron

### Yeni edge function: `reconcile-stripe-subscriptions`
- `verify_jwt = false`, sadece cron tetikler.
- Akış:
  1. `profiles` tablosundan `stripe_subscription_id IS NOT NULL` olan tüm satırları çek.
  2. Her biri için `stripe.subscriptions.retrieve(id)` çağır.
  3. Stripe'tan dönen `status`, `current_period_end`, `cancel_at_period_end` ile DB'deki değerleri karşılaştır.
  4. Fark varsa `profiles` güncellenir + `subscription_events`'e `event_type = 'cron.drift_correction'` kaydı düşülür (`previous_*` / `new_*` doldurulur).
  5. Stripe'ta artık bulunmayan abonelikler için status `canceled`, tier `null` set edilir.
  6. Toplam taranan / düzeltilen sayısı response'da döner.
- Gece çalışacağı için tek seferde 200 satırlık batch + 200ms bekleme ile rate-limit dostu.

### Cron job (`supabase--insert` ile, migration değil — kullanıcıya özgü URL/anon key içeriyor)
- `pg_cron` ve `pg_net` extension'ları (yoksa enable).
- Schedule: `0 3 * * *` (her gün UTC 03:00). Job adı: `reconcile-stripe-subscriptions-daily`.
- Body: `{ "source": "cron" }`.

---

## 2. Tier DB Swap: `pro` ↔ `elite`

### DB migration
- `UPDATE profiles SET subscription_tier = CASE subscription_tier WHEN 'pro' THEN 'elite' WHEN 'elite' THEN 'pro' END WHERE subscription_tier IN ('pro','elite');`
- `stripe_transactions` ve `subscription_events` içinde tier alanları varsa aynı CASE swap.
- `coaching_packages`, `payments`, `assigned_payments` gibi tier referansı tutan tabloları taradım — `subscription_tier` sadece `profiles`'te. Diğer tablolar etkilenmez.

### Stripe price → internal tier mapping swap
İki edge function dosyasında:

**`supabase/functions/stripe-subscription-webhook/index.ts`**
- Sabit `PRICE_TO_TIER`: `price_1TiFCwRsNTZwyhMjEo4egJ89` artık `"elite"` (önce pro), `price_1TiFCxRsNTZwyhMjFYeJdUlx` artık `"pro"` (önce elite).
- Env override: `STRIPE_PRICE_PRO` → `"elite"`, `STRIPE_PRICE_ELITE` → `"pro"`.

**`supabase/functions/create-coach-subscription/index.ts`**
- `PRICE_ENV_BY_TIER`: `pro: "STRIPE_PRICE_ELITE"`, `elite: "STRIPE_PRICE_PRO"` (isimler kod sabit kalıyor ama Stripe price ID'leri swap edilir — yeni semantikte "pro" = pahalı/5000 TL plan).
- `FALLBACK_PRICE_BY_TIER` aynı şekilde swap.

### Display & feature içerikleri (`src/lib/subscriptionTiers.ts`)
- `id: "pro"` objesi → name `"Pro"`, priceMonthly `5000`, badge `"Kurumsal"`, ileri seviye (eski elite) feature list'i.
- `id: "elite"` objesi → name `"Elit"`, priceMonthly `3000`, badge `"En Popüler"`, highlight `true`, eski pro feature list'i.
- `starter` aynı kalır (`"Başlangıç"`).
- `normalizeTier`: `elit/ileri/popüler` → `"elite"`, `pro/profes/kurum` → `"pro"` (anahtar kelimeler swap edildi).
- `TIERS` array sırası: starter, elite (3000), pro (5000) — UI'da soldan sağa fiyat artar.

### Bootstrap script (`supabase/functions/bootstrap-subscription-prices/index.ts`)
- Tier listesi:
  - `starter` → "Dynabolic Başlangıç", 100000 kuruş
  - `elite` → "Dynabolic Elit", 300000 kuruş (eski pro fiyat/içerik)
  - `pro` → "Dynabolic Pro", 500000 kuruş (eski elite)
- Not: Bu script tekrar çalıştırılırsa Stripe'ta yeni product/price oluşturur; mevcut Stripe price ID'lerinin manuel olarak güncellenmesi gerekmez çünkü mapping kod tarafında swap edildi.

### Settings UI
- `Settings.tsx`'teki tier badge mapping `normalizeTier` üzerinden çalıştığı için ek değişiklik gerekmez; yeni isimler otomatik gelir.

---

## Sıra
1. DB migration (tier swap).
2. Drift cron için edge function dosyaları + migration (extensions).
3. Frontend & edge function kod swap'i.
4. `supabase--insert` ile cron schedule.
5. Webhook ve reconcile fonksiyonlarının deploy edildiğini test et.

## Not
- Stripe Dashboard'daki product **isimleri** ("Dynabolic İleri Seviye" / "Profesyonel") manuel olarak değiştirilmeli — checkout sayfasında müşteri eski adı görmesin diye. Bunu yapmamı istiyor musunuz? Şu an plana dahil etmedim çünkü API key kapsamı belli değil; webhook & subscription kodu zaten yeni adlandırmaya göre eşler.
- Mevcut aktif Stripe abonelikleri **fiyat değiştirmez** — sadece DB'deki etiket ismi swap olur. Yeni satın almalar yeni adlarla görünür.

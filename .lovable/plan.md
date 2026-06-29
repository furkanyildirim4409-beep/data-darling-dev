
## Pentest Edge Function Düzeltmeleri

Mevcut kodu inceledim — rapor edilen iki bulgu için durum şu:

### 1. `send-coaching-invite` — Rate Limit Off-by-One

Mevcut kod zaten `bump_edge_rate_limit` RPC kullanıyor ve kontrol `(hourCount ?? 0) > 5` şeklinde — yani **6. davette** bloklanıyor. Rapor "5/saat" istiyorsa doğru davranış **5. davette bloklamak**, yani `>= 5` (veya `> 4`) olmalı. Düzeltme:

- `(hourCount ?? 0) > 5` → `(hourCount ?? 0) >= 5`  (saatte max 5 davete izin)
- `(dayCount ?? 0) > 20` → `(dayCount ?? 0) >= 20` (günde max 20)

Not: Raporda bahsedilen `recentInvites.length >= 4` literal kodu projede yok; off-by-one güncel RPC sayaç mantığına uyarlanıyor.

### 2. `create-coach-subscription` — Server-side Price Validation

Mevcut kod zaten client'tan **sadece `tierId`** alıyor (Zod ile `["starter","pro","elite"]` enum doğrulaması), `priceId` client'tan kabul edilmiyor. Server-side `PRICE_ENV_BY_TIER` + `FALLBACK_PRICE_BY_TIER` map'i üzerinden çözülüyor. Yani bulgu pratikte zaten kapalı.

Yine de raporun istediği "explicit TIER_PRICE_MAP" disiplinini netleştirmek için ek savunma katmanları ekleyeceğim:

- Çözülen `priceId`'nin sabit allow-list içinde olduğunu doğrulayan ek bir guard (`ALLOWED_PRICE_IDS` set).
- Çözüm başarısızsa 500 + audit log.
- Zod şemasını `.strict()` yaparak ekstra alanların (örn. saldırganın `priceId` enjekte etme denemesi) reddedilmesi.
- Yorum satırı: client'tan price kabul edilmediğini açıkça belirten güvenlik notu.

### Dosya değişiklikleri

- `supabase/functions/send-coaching-invite/index.ts` — limit karşılaştırmaları `>=` olarak değişir.
- `supabase/functions/create-coach-subscription/index.ts` — `BodySchema.strict()`, çözülen `priceId` için allow-list kontrolü, açıklayıcı yorum.

Başka kod/şema/RLS değişikliği yok.

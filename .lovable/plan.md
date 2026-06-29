## Pentest Raporu — Zafiyet Kapatma Planı

Raporda 4 CRITICAL, 2 HIGH, 1 MEDIUM bulgu var. Her birine karşılık yapılacak işler:

---

### 1) [CRITICAL] Athlete PII Modification Bypass (profiles.birth_date)
Mevcut "Coaches can update athlete profiles" ve "Team members can update athlete profiles" RLS politikaları sadece `subscription_*`, `role`, `email`, `freeze_until` alanlarını kilitliyor. `birth_date`, `full_name`, `username`, `gender`, `height_cm`, `weight_kg`, `phone_number` (artık `profile_secrets`'te ama legacy), `avatar_url`, `bio` gibi PII alanları koç tarafından değiştirilebiliyor.

**Migration:**
- "Coaches can update athlete profiles" ve "Team members can update athlete profiles" politikalarını DROP edip yeniden oluşturacağım. Yeni `WITH CHECK` koç/ekip için yalnızca **koçluk-iş** alanlarının (`coach_id`, `coach_notes`, `is_active`, `freeze_until` sıfırlama hariç) değişmesine izin verir; sporcunun kendi PII alanları (`birth_date`, `full_name`, `username`, `gender`, `height_cm`, `weight_kg`, `avatar_url`, `bio`, `email`, `subscription_*`, `role`, `xp`, `bio_coins`, `level`) `IS NOT DISTINCT FROM` guard'ı ile kilitlenecek.

---

### 2) [CRITICAL] LLM Credit Exhaustion (`generate-ai-program`)
Edge function JWT + coach rolü kontrolü yapıyor ama oran sınırı yok.

**Edge function:**
- `supabase/functions/generate-ai-program/index.ts` içine **token-bucket** rate limit: kullanıcı başına **saatte 10**, **günde 30** istek. Sayaç için yeni `public.ai_rate_limit_counters` tablosu (user_id, window_start, count) — service role tarafından okuma/yazma. Limit aşıldığında **HTTP 429** + `Retry-After` döner.

**Migration:**
- `ai_rate_limit_counters` tablosu + GRANT'lar + RLS (sadece service_role) + günlük temizleme için basit `created_at < now()-interval '2 days'` cron job (pg_cron).

---

### 3) [CRITICAL] Email Spam Abuse (`send-coaching-invite`)
Koç rol kontrolü var ama sınırsız davet gönderilebiliyor.

**Edge function:**
- Aynı edge function'a koç başına **günde 20**, **saatte 5** davet limiti. Sayaç için `public.invite_rate_limit_counters` (veya 1. madde ile aynı tabloyu `bucket` kolonuyla paylaşmak — birleşik `public.edge_rate_limits(user_id, bucket, window_start, count)` tablosu yapacağım).
- Ek olarak `leadEmail` başına son 24 saatte tekrar gönderim engelleme (`coach_invites` tablosunda mevcut `created_at` üzerinden bakar).
- Limit aşılınca **429**.

---

### 4) [CRITICAL] Unauthorized File Upload (avatars bucket)
DB sorgusunda `avatars` bucket politikaları aslında `auth.uid() = foldername[1]` zorluyor; raporun PoC'si muhtemelen kendi kullanıcı klasörü dışına yazamamıştır. Yine de güvenlik derinleştirme için:

**Migration (defensive):**
- `avatars` bucket'ını `public = false` yapacağım (zaten öyle olabilir, doğrulayacağım). Şu anki INSERT/UPDATE/DELETE policy'lerine ek olarak `anon` rolünden tüm yazma haklarını revoke etmek için politikayı `TO authenticated` ile sınırlayacağım. Maks dosya boyutu 5MB ve `allowed_mime_types = image/*` enforce edilecek (`storage.buckets`'ta).
- Aynı sertleştirme `social-media`, `chat-media`, `progress-photos`, `blood-test-pdfs`, `challenge-proofs`, `review-images`, `digital-products`, `products`, `coaching-packages`, `academy-*` bucket'larında MIME ve boyut zorlamasıyla yapılacak.

---

### 5) [HIGH] Missing CSP / X-Frame-Options
`public/_headers` mevcut ama `app.dynabolic.co` Cloudflare proxy arkasından geçtiği için Lovable'ın `_headers` dosyası **devreye girmiyor** — bu yüzden tarayıcı header'ları göremiyor.

**Çözüm:**
- `index.html` <head> içine zaten CSP `<meta>` var; X-Frame-Options eşdeğeri olarak CSP `frame-ancestors 'none'` direktifi eklenmiş halini doğrulayacağım, eksikse ekleyeceğim.
- Kullanıcıya **Cloudflare Transform Rule** snippet'i sağlayacağım (DNS_SECURITY_SETUP.md'ye ek bölüm): Response Headers Modify ile `Content-Security-Policy`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` enjeksiyonu. (Cloudflare proxy mode'da bu tek güvenilir yol.)

---

### 6) [HIGH] No Auth Rate Limiting
`supabase/config.toml` zaten `token_sign_in = 30/hour` ayarlıyor ama bu **per-IP**. Test 30/30 başarısız = sadece kötü kimlik bilgisi denemesi (HTTP 400 normal), 429 yok çünkü limit 30 ve eşiği aşmamış.

**Çözüm:**
- `auth.rate_limit.token_sign_in` ve `sign_up_sign_in` değerlerini **10**'a, `email_sent`/`sms_sent`'i **5**'e indireceğim.
- `Login.tsx`'e **client-side 5 başarısız deneme = 60sn cooldown** + opsiyonel Cloudflare Turnstile placeholder ekleyeceğim (sadece UI bayrağı; gerçek Turnstile entegrasyonu kullanıcı isterse ayrı adım).

---

### 7) [MEDIUM] Stripe Checkout Validation
`create-coach-subscription` edge function'unu okuyup fiyatın **server-side** olarak tier→price_id sabit haritasından alındığını ve client'tan price gelmediğini doğrulayacağım. Eksikse `STRIPE_PRICE_*` env'lerinden mapping zorlayacağım.

---

### Teslimat Sırası
1. Migration: profiles UPDATE policy sertleştirme + `edge_rate_limits` tablosu + storage bucket MIME/size + bucket public=false doğrulama.
2. Edge function güncellemeleri: `generate-ai-program`, `send-coaching-invite` rate limit; `create-coach-subscription` price guard.
3. `supabase/config.toml` rate limit düşürme.
4. `Login.tsx` client cooldown.
5. `DNS_SECURITY_SETUP.md` içine Cloudflare Transform Rule talimatı.
6. `security--manage_security_finding` ile ilgili bulguları işaretleme + `security--update_memory` güncelleme.

### Riskler
- Profiles policy sıkılaşması sonrası koç UI'sında bir form yanlışlıkla PII alanı gönderirse 403 alır; mevcut koç ekranlarını (`AthleteDetail`, `BodyMeasurementsStudio`) gözden geçirip yalnızca izin verilen alanları gönderdiklerini teyit edeceğim.
- Rate limit tablosu yüksek trafikte hot row olabilir; basit `(user_id, bucket, window_start)` PK + UPSERT ile yeterli.


# Dynabolic Email Altyapısı — Onaylanmış Plan

## Cevaplara göre kesinleşen kararlar
1. **Eski welcome trigger DROP edilecek** — çift mail yok, tek kaynak `send-email`
2. **Footer adresi**: `YILDIRIM GROUP LTD, 71 - 75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom`
3. **Order-receipt aktif entegrasyon**: `stripe-subscription-webhook` ve `handle-universal-orders` fonksiyonları başarılı ödemede `send-email` fonksiyonunu tetikleyecek

## Yapılacaklar (Build sırası)

### A. Migration
```sql
-- 1. Eski welcome trigger'ını sil (global-system-automation'ı besleyen)
DROP TRIGGER IF EXISTS <mevcut_welcome_trigger> ON public.profiles;

-- 2. Yeni trigger: profiles INSERT → send-email (type: 'welcome')
CREATE FUNCTION public.trigger_send_welcome_email() ...
  net.http_post('.../send-email', body: {type:'welcome', to, data:{name}})
CREATE TRIGGER after_profile_insert_send_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW WHEN (NEW.email IS NOT NULL AND NEW.role='athlete')
  EXECUTE FUNCTION public.trigger_send_welcome_email();
```

### B. React Email şablonları
`supabase/functions/_shared/email-templates/`:
- **welcome.tsx** — Hoş geldin, lime CTA "Uygulamaya Git"
- **notification.tsx** — Generic: `{title, body, ctaLabel?, ctaUrl?}`
- **order-receipt.tsx** — Sipariş kalemleri tablosu, toplam, kargo adresi

Ortak stil: `#0a0a0a` bg, `#f8f8f8` text, `hsl(68 100% 50%)` lime button + siyah text, Arial/Helvetica, footer'da Yıldırım Group adresi + `© 2026` + `{{unsubscribe_url}}` yer tutucu, preview text, plain-text alt.

### C. Yeni Edge Function
`supabase/functions/send-email/index.ts` + `deno.json`:
- Zod validation: `{type, to, data}`
- `renderAsync()` → HTML
- Resend API (`RESEND_DIRECT_API_KEY`), `from: 'Dynabolic <noreply@dynabolic.co>'`
- `List-Unsubscribe` header
- `emails` tablosuna outbound log
- Auth: JWT (user kendi maili) VEYA service-role bearer (server)
- CORS + rate limit
- `config.toml`: `verify_jwt = false` (JWT'yi kod içinde kontrol edilecek)

### D. Mevcut fonksiyonlara order-receipt hook
- **`handle-universal-orders/index.ts`**: order `status='paid'` olduğunda `send-email` çağrısı ekle (idempotency: `order-receipt-{order_id}`)
- **`stripe-subscription-webhook/index.ts`**: `invoice.payment_succeeded` event'inde `send-email` çağrısı ekle
- Mevcut mantık bozulmayacak, sadece başarı yolunda ek çağrı

### E. Deploy
`send-email`, `handle-universal-orders`, `stripe-subscription-webhook` fonksiyonları deploy edilir.

## Dosya listesi
```
YENİ:
  supabase/functions/_shared/email-templates/welcome.tsx
  supabase/functions/_shared/email-templates/notification.tsx
  supabase/functions/_shared/email-templates/order-receipt.tsx
  supabase/functions/send-email/index.ts
  supabase/functions/send-email/deno.json

GÜNCELLENEN:
  supabase/config.toml                              (send-email eklenir)
  supabase/functions/handle-universal-orders/index.ts
  supabase/functions/stripe-subscription-webhook/index.ts

MIGRATION:
  - DROP old welcome trigger
  - CREATE new trigger_send_welcome_email + trigger
```

Onayladıktan sonra migration ile başlıyorum, ardından kod + deploy.

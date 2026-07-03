## Amaç
Supabase Auth mailleri (signup, magic link, recovery, invite, email change, reauth) tamamen Supabase'in kendi default SMTP'sine bırakılacak. Bizim `send-email` altyapımız YALNIZCA uygulama içi bildirimler için çalışacak: `welcome`, `order_receipt`, `notification`. React Email şablonları placeholder olacak; tasarım sonra enjekte edilecek.

## Yapılacaklar

### 1) Auth interception'ı tamamen kaldır
- `supabase/functions/auth-email-hook/` klasörünü sil (index.ts + deno.json).
- `supabase/config.toml` içindeki `[functions.auth-email-hook]` bloğunu kaldır.
- `supabase/functions/trigger-welcome-email/` — eski/duplicate welcome fonksiyonunu sil (yerine yeni trigger + `send-email` var).
- Deploy sonrası Supabase Auth Hooks panelinde "Send Email Hook" kapalı olmalı (kullanıcı UI'dan doğrulayacak — biz webhook'u kod tarafında imha ediyoruz).

### 2) `send-email` fonksiyonunu sadeleştir
- `magic_link` tipini `RequestSchema`'dan ve `renderEmail` switch'inden çıkar (auth kapsamı).
- `MagicLinkEmail` importunu kaldır.
- Tipler: sadece `welcome`, `notification`, `order_receipt`.
- Auth, CORS, Zod validation, Resend çağrısı, `emails` tablosuna log, `List-Unsubscribe` header aynen kalır.
- `from` adresleri: welcome → `Dynabolic <noreply@dynabolic.co>`, notification → `notify@dynabolic.co`, order_receipt → `orders@dynabolic.co`.

### 3) React Email şablonlarını placeholder yap
Aşağıdaki üç dosyanın içeriği yalnızca minimal bir React Email iskeleti + `<h1>[PLACEHOLDER - DESIGN WILL BE INJECTED LATER]</h1>` olacak. Props tipleri korunur ki `send-email` derlensin, ama JSX içi placeholder:
- `supabase/functions/_shared/email-templates/welcome.tsx`
- `supabase/functions/_shared/email-templates/notification.tsx`
- `supabase/functions/_shared/email-templates/order-receipt.tsx`

Auth şablonlarına (`signup.tsx`, `magic-link.tsx`, `recovery.tsx`, `invite.tsx`, `email-change.tsx`, `reauthentication.tsx`) DOKUNULMAYACAK — zaten `auth-email-hook` silindiği için çağrılmıyorlar; ileride referans olarak dursunlar.

### 4) DB Trigger doğrulaması (welcome)
Mevcut migration `after_profile_insert_send_welcome` trigger'ı `net.http_post` ile `send-email`'e `type: 'welcome'` çağrısı yapıyor — bu KALIR. Sadece eski `premium_welcome_email_trigger`'ın drop edildiği teyit edilecek; ek migration gerekmez.

### 5) Webhook entegrasyonları (order receipt)
Zaten yerinde:
- `handle-universal-orders` → sipariş `paid` olduğunda `send-email` (`type: 'order_receipt'`).
- `stripe-subscription-webhook` → `invoice.payment_succeeded` → `send-email`.
Bu dosyalara dokunulmayacak (magic_link tipi kullanmıyorlar).

### 6) Deploy
`send-email` yeniden deploy. `auth-email-hook` ve `trigger-welcome-email` silindiği için otomatik kaldırılacak (config.toml'dan da düşecek).

## Teknik notlar
- `magic_link` tipini kaldırınca istemci tarafında bu tipi çağıran kod yok (grep ile teyit edilecek).
- `verify_jwt = false` `send-email` için korunuyor; auth header yoksa `CRON_SECRET` / `x-webhook-secret` yolu geçerli.
- Auth mailleri artık Supabase default SMTP üzerinden gidecek — kullanıcı isterse Dashboard → Auth → SMTP'den kendi Resend SMTP kimlik bilgilerini takabilir; kodda bir değişiklik gerekmez.

## Değiştirilecek/silinecek dosyalar
- Sil: `supabase/functions/auth-email-hook/index.ts`, `supabase/functions/auth-email-hook/deno.json`
- Sil: `supabase/functions/trigger-welcome-email/index.ts`
- Düzenle: `supabase/config.toml` (`auth-email-hook` ve `trigger-welcome-email` blokları kaldır)
- Düzenle: `supabase/functions/send-email/index.ts` (magic_link çıkar)
- Placeholder'la: `welcome.tsx`, `notification.tsx`, `order-receipt.tsx`

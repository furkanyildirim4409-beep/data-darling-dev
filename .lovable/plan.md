# Supabase Auth: E-posta & SMS Doğrulama Aktivasyonu

## Durum
Şu an projede:
- ✅ TOTP (Authenticator) 2FA aktif — `TwoFactorSetup.tsx` + Login MFA interceptor mevcut
- ❌ E-posta doğrulama (signup confirmation) durumu Supabase tarafında kontrol edilmedi
- ❌ SMS / Phone OTP doğrulama hiç entegre değil
- Custom auth email template'leri scaffold edilmemiş (varsayılan Lovable email'leri kullanılıyor)

## Önemli Kısıtlamalar

**1. SMS Doğrulama → Supabase Dashboard'dan provider gerekli**
Supabase SMS OTP, kod tarafından açılamaz. Üçüncü taraf SMS provider (Twilio, MessageBird, Vonage, Textlocal) gerekir:
- Provider hesabı + API key/secret
- Supabase Dashboard → Authentication → Providers → Phone → enable + credentials
- Maliyet: SMS başına ücret (Twilio ~$0.04/SMS TR)

Bunu Lovable agent **kullanıcı yerine yapamaz** — credential'ları sen gireceksin.

**2. E-posta doğrulama → İki seviye**
- **a) Signup email confirmation aç/kapa:** Supabase Dashboard → Authentication → Sign In / Providers → Email → "Confirm email" toggle (kod tarafından değiştirilemez)
- **b) Custom branded email template'leri:** `email_domain--scaffold_auth_email_templates` ile yapılabilir (Dynabolic markalı confirmation/recovery/magic-link mailleri)

---

## Plan

### Aşama 1 — E-posta Doğrulama (kod + UI)

**1.1 Signup akışını "email confirm" için hazırla**
`src/contexts/AuthContext.tsx` içindeki `signUp`:
- `emailRedirectTo: ${window.location.origin}/auth/callback` olarak güncelle
- Başarılı signup sonrası kullanıcıya "E-postanı kontrol et" ekranı göster

**1.2 Yeni sayfa: `src/pages/AuthCallback.tsx`**
- URL hash'inden `access_token` / `type=signup` / `type=recovery` parse et
- `signup` → "E-posta doğrulandı" toast + `/` yönlendirme
- `recovery` → `/reset-password` yönlendirme

**1.3 Yeni sayfa: `src/pages/VerifyEmailPending.tsx`**
- Signup sonrası gösterilir
- "Doğrulama linki gönderildi" mesajı + "Tekrar gönder" butonu (`supabase.auth.resend({ type: 'signup', email })`)

**1.4 Custom email template'leri (markalı)**
`email_domain--scaffold_auth_email_templates` çağrısı:
- Dynabolic marka renkleri (lime primer, dark bg) ile 6 template (signup, magiclink, recovery, invite, email-change, reauthentication)
- `auth-email-hook` edge function deploy
- DNS zaten doğrulanmışsa email'ler aktif olur

### Aşama 2 — SMS / Telefon Doğrulama

**2.1 Yeni Settings bölümü: `src/components/settings/PhoneVerification.tsx`**
TOTP setup ile aynı stilde:
- "Telefon Numarası Ekle" → input (+90...) → `supabase.auth.updateUser({ phone })` → OTP gönderilir
- 6 haneli SMS kodu input (InputOTP) → `supabase.auth.verifyOtp({ phone, token, type: 'phone_change' })`
- Doğrulanmış telefon → "Aktif" badge + "Kaldır" butonu

**2.2 Login'de SMS OTP opsiyonu (opsiyonel — sormak istiyorum)**
İki seçenek:
- **A) Sadece TOTP korunsun, SMS opsiyonel ikinci faktör** — TOTP'si olmayan kullanıcılar için fallback
- **B) "Telefonla giriş yap" sekmesi** — şifresiz, sadece SMS OTP ile login

**2.3 Settings sayfasına entegre**
`src/pages/Settings.tsx` → `TwoFactorSetup`'ın altına `PhoneVerification` ekle.

### Aşama 3 — Kullanıcının manuel adımları

Şunları sen Supabase Dashboard'da yapacaksın (linkleri vereceğim):
1. **Auth → Providers → Email** → "Confirm email" toggle ON
2. **Auth → Providers → Phone** → Provider seç (Twilio öneririm) + Account SID / Auth Token / Message Service SID gir
3. **Auth → URL Configuration** → Site URL: `https://app.dynabolic.co`, Redirect URLs'e `/auth/callback` ekle

---

## Kullanıcıya Sorular (devam etmeden önce)

1. **SMS provider:** Twilio mu, başka bir şey mi? Hesabın var mı yoksa kuruluma yardım edeyim mi?
2. **SMS kullanım amacı:** Sadece koçlar Settings'ten telefon ekleyip ikinci faktör olarak mı kullansın, yoksa Login ekranında "SMS ile giriş" sekmesi de olsun mu?
3. **Markalı e-posta template'leri:** Şimdi scaffold edelim mi (Dynabolic teması + lime renk)?
4. **Signup email confirmation:** Şu an muhtemelen kapalı — açtığımızda mevcut doğrulanmamış kullanıcılar bir sonraki login'de doğrulama isteyecek. Açalım mı?

Cevap geldikten sonra ilgili kod adımlarını uygulayacağım.

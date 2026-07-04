# Dinamik `emailRedirectTo` Mimarisi

## Amaç
Supabase auth mailleri (signup doğrulama, magic link, şifre sıfırlama) tetiklendiğinde link, isteği yapan platforma göre doğru domaine yönlensin:
- Koç → `https://app.dynabolic.co/auth/callback`
- Öğrenci → `https://dynabolic.co/auth/callback`
- Localhost / preview → `window.location.origin/auth/callback` (geliştirme kolaylığı)

## Bu Repo (Koç Paneli) İçindeki Durum Tespiti
Kod taramasında bulunan tek e-posta bazlı auth çağrısı:

- `src/contexts/AuthContext.tsx` → `supabase.auth.signUp(...)` içinde sabit `emailRedirectTo: \`${window.location.origin}/auth/callback\``.

Diğerleri e-posta akışı değil, dolayısıyla `emailRedirectTo` gerektirmiyor:
- `src/pages/Login.tsx` ve `src/components/settings/TwilioSmsTest.tsx` içindeki `signInWithOtp` çağrıları **SMS** (`phone` + `channel: 'sms'`).
- `resetPasswordForEmail` çağrısı repoda **yok** (şu an şifre sıfırlama akışı yalnızca zorunlu reset sonrası `updateUser` ile yürüyor).

Not: Öğrenci uygulaması ayrı bir Lovable projesi (`81cfe6d0-...`). Aynı değişiklik orada da uygulanmalı; bu plan bu repoya (koç paneli) odaklanır. Değişiklik sonrası öğrenci projesi için de eşdeğer talebi verirsen aynı yardımcıyı orada da kuracağım.

## Değişiklikler

### 1. Yeni yardımcı: `src/lib/authRedirect.ts`
Tek doğru kaynak. Rol/context alır, doğru URL üretir.

```ts
export type AuthPlatform = 'coach' | 'athlete';

const COACH_URL = 'https://app.dynabolic.co';
const ATHLETE_URL = 'https://dynabolic.co';

export function getAuthRedirectUrl(
  platform: AuthPlatform,
  path: string = '/auth/callback'
): string {
  // Localhost + Lovable preview → mevcut origin'de kal (dev DX)
  const host = window.location.hostname;
  const isDev =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.lovable.app') ||
    host.endsWith('.lovableproject.com');

  if (isDev) return `${window.location.origin}${path}`;

  const base = platform === 'athlete' ? ATHLETE_URL : COACH_URL;
  return `${base}${path}`;
}
```

### 2. `src/contexts/AuthContext.tsx`
`signUp` içinde `selectedRole`'e göre redirect seç:

```ts
import { getAuthRedirectUrl } from '@/lib/authRedirect';

// ...
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: metadata,
    emailRedirectTo: getAuthRedirectUrl(
      selectedRole === 'athlete' ? 'athlete' : 'coach'
    ),
  },
});
```

Ayrıca `AuthContext`e ileride kullanılmak üzere ince bir sarmalayıcı ekleyeceğim (opsiyonel, aynı PR'da):

```ts
const resetPassword = (email: string, platform: AuthPlatform = 'coach') =>
  supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthRedirectUrl(platform, '/reset-password'),
  });
```

Context'e `resetPassword` olarak eklenecek; şu an çağıran yok, kullanıma hazır.

### 3. Değişmeyecek dosyalar
- `TwilioSmsTest.tsx`, `Login.tsx`: SMS OTP, `emailRedirectTo` uygulanmaz.
- `supabase/functions/_shared/email-templates/*`: link Supabase tarafından `{{ .ConfirmationURL }}` olarak enjekte ediliyor; `emailRedirectTo` zaten bu URL'nin origin'ini belirler, template değişikliği gerekmez.

## Supabase Dashboard Notu (kullanıcı aksiyonu)
`emailRedirectTo`'nun kabul edilmesi için Supabase Auth → URL Configuration → **Redirect URLs** listesine şunlar eklenmiş olmalı (yoksa Supabase URL'yi Site URL'ye düşürür):

- `https://app.dynabolic.co/auth/callback`
- `https://app.dynabolic.co/reset-password`
- `https://dynabolic.co/auth/callback`
- `https://dynabolic.co/reset-password`
- `http://localhost:8080/**` (dev)
- `https://*.lovable.app/**` (preview)

Onay verirsen plan mode'dan çıkıp uygularım.

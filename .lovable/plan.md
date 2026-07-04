## Sorun
`Register.tsx` formu telefon numarasını topluyor ve `AuthContext.signUp` bunu `raw_user_meta_data.pending_phone` olarak Supabase'e yolluyor. Ancak `handle_new_user` trigger'ı bu değeri hiçbir tabloya yazmıyor → telefon kayboluyor.

## Mimari Notu
Projede `profiles` tablosunda `phone` sütunu **yok** (ve olmamalı). Hassas PII (telefon, IBAN vb.) güvenlik gereği ayrı bir owner-only tabloda tutuluyor:

- `public.profile_secrets (user_id uuid PK, phone_number text, iban text, ...)`
- `AuthContext.fetchProfile` zaten telefon/iban için buradan okuyor.
- `PhoneVerification.tsx` telefon güncellemesini burada yapıyor.

Bu yüzden telefonu `profiles`'a değil `profile_secrets`'a yazmak doğru mimari.

## Çözüm
Tek bir migration ile `handle_new_user()` fonksiyonunu genişletmek:

1. `raw_user_meta_data->>'pending_phone'` değerini oku.
2. Basit doğrulama (E.164 benzeri: `^\+?[0-9]{10,20}$`, aksi halde yok say).
3. Geçerli ise `INSERT INTO public.profile_secrets (user_id, phone_number) VALUES (new.id, v_phone) ON CONFLICT (user_id) DO UPDATE SET phone_number = EXCLUDED.phone_number WHERE public.profile_secrets.phone_number IS NULL;` (mevcut telefonu ezmez).

## Frontend
Değişiklik gerekmez — `Register.tsx` zaten telefonu normalize edip `signUp(...phone)` ile yolluyor ve `AuthContext` `pending_phone` metadata'sına ekliyor.

## Doğrulanmayan telefon uyarısı
`PhoneVerification.tsx` akışı telefon **doğrulama** için Twilio OTP kullanıyor. Bu değişiklikte kayıt anındaki telefon `is_verified=false` mantığıyla saklanır (profile_secrets'ta doğrulama alanı yoksa dokunmuyoruz; kullanıcı Ayarlar → Güvenlik'ten SMS doğrulaması yapmaya devam edebilir — mevcut UX korunuyor).

Onaylarsan migration'ı gönderirim.
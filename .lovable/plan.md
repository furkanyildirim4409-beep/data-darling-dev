# Twilio SMS + Telefon Numarası Akışı

Mevcut durumda Login ekranında SMS sekmesi ve Ayarlar > Güvenlik altında `PhoneVerification` paneli zaten var. Eksik olan üç parçayı tamamlayacağız.

## 1) Ayarlar > Güvenlik: "Twilio SMS Test" paneli (yeni)

Amaç: Twilio kimlik bilgileri Supabase Auth Provider'a girildikten sonra, koçun hesabını değiştirmeden uçtan uca SMS gönderim/doğrulama testi yapması.

- Yeni dosya: `src/components/settings/TwilioSmsTest.tsx`
  - Bir telefon input'u (E.164, +90 önekli) + "Test Kodu Gönder" butonu.
  - `supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false, channel: 'sms' } })` çağrısı.
    - `shouldCreateUser:false` sayesinde mevcut hesabı etkilemez; provider hatasıysa Twilio konfigürasyon hatası net görünür.
  - 6 haneli `InputOTP` ile kodu doğrulamak için `verifyOtp({ phone, token, type: 'sms' })` (sandbox modu, sadece akışı test eder; başarılıysa "Twilio entegrasyonu çalışıyor" toast'u, oturum açmadan hemen `supabase.auth.signOut()` ile temizlik yapar).
  - Hata durumlarını Türkçe açık mesajlarla gösterir: "Provider yapılandırılmamış", "Hatalı kod", "Rate limit", vb.
- `src/pages/Settings.tsx` Güvenlik bölümüne `<TwilioSmsTest />` ekle (mevcut `<PhoneVerification />`'ın hemen altına).

## 2) Kayıt ekranı: opsiyonel telefon numarası (email zorunlu kalır)

- `src/pages/Register.tsx`:
  - Email + şifre **zorunlu** (mevcut davranış korunur).
  - Yeni opsiyonel alan: "Telefon Numarası (opsiyonel)" — E.164 formatı, kullanıcıya "Daha sonra Ayarlar'dan doğrulayabilirsiniz" notu.
  - `signUp(...)` çağrısına metadata olarak telefon geçilir. `AuthContext.signUp` imzasına opsiyonel `phone` parametresi eklenir; `supabase.auth.signUp` çağrısına `options.data.pending_phone = phone` olarak konur (auth.users.phone'a yazılmaz, çünkü o doğrulama gerektirir).
  - Kayıt sonrası kullanıcıya: "Telefonunu doğrulamak için Ayarlar > Güvenlik bölümünden devam et."

## 3) Giriş ekranı: telefon seçeneği

- Login'de SMS sekmesi zaten var; sadece üst notu netleştir: "Daha önce telefonunu doğrulamış koçlar SMS ile giriş yapabilir; ilk kez kayıt olacaksanız E-posta sekmesini kullanın."

## 4) Akış kuralları

- Email **her zaman** zorunlu (kayıt, şifre sıfırlama, doğrulama maili için).
- Telefon **opsiyonel** ve sadece Settings'te `supabase.auth.updateUser({ phone })` + `verifyOtp({ type: 'phone_change' })` ile doğrulanır (mevcut `PhoneVerification` aynen kullanılır).
- Doğrulanmış telefon → SMS ile giriş otomatik olarak çalışır (Supabase Auth tarafından).

## Teknik notlar

- Tüm SMS işlemleri `supabase.auth.*` üzerinden gider; Twilio'ya doğrudan istek atan edge function yazılmaz (Supabase zaten Twilio'yu Auth Provider olarak kullanır).
- DB değişikliği yok.
- `pending_phone` metadata değeri, ileride otomatik bir akış için `auth-email-hook`/trigger ile kullanılabilir — bu plan kapsamında sadece bilgi olarak saklanır.

## Manuel ön koşul (kullanıcı tarafı)

Supabase Dashboard → Authentication → Providers → Phone:
- Provider: Twilio
- Account SID, Auth Token, Messaging Service SID (veya From Number) gir
- Enable Phone Provider

Bu yapılmadan SMS gönderimi 422/500 hatası verir; Test panelinde mesaj net görünecek.

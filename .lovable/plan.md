## Analiz

Uygulama ve Supabase Auth loglarına göre SMS doğrulama yapılmamasının ana nedeni kod değil, Twilio/Supabase Phone Provider yapılandırması:

- `/user` `phone_change` isteği `422 sms_send_failed` dönüyor.
- Hata: `Twilio Authenticate ... error 20003`.
- Twilio 20003, Twilio tarafında kimlik doğrulama hatasıdır: Account SID/Auth Token yanlış, API key yetkisiz, yanlış subaccount, eski/rotate edilmiş token veya Supabase Phone Provider'a hatalı credential girilmiş olabilir.
- `/otp` için ayrıca `otp_disabled / Signups not allowed for otp` görülüyor. Bu, test panelinin kayıtlı olmayan numaraya OTP göndermeye çalışmasından ve Phone OTP/signup ayarlarından kaynaklanıyor; test UI bunu yanlışlıkla “SMS gönderildi” gibi gösterebiliyor.

## Çözüm Planı

1. **Hata mesajlarını düzelt**
   - `TwilioSmsTest`, `PhoneVerification` ve SMS login akışında Twilio 20003, `sms_send_failed`, `otp_disabled`, `signups not allowed` hataları için Türkçe ve doğru yönlendiren mesajlar gösterilecek.
   - `signups not allowed` artık başarı gibi gösterilmeyecek; kullanıcıya “Bu numara sistemde kayıtlı değil / OTP signup kapalı” denecek.

2. **Test akışını güvenilir hale getir**
   - Test paneli “numara hesapta yoksa bile gönderildi” varsayımını kaldıracak.
   - Test için iki net mod olacak:
     - **Kayıtlı telefonla giriş testi:** daha önce doğrulanmış telefonla `signInWithOtp`.
     - **Mevcut oturumda telefon doğrulama testi:** ayarlar ekranındaki `updateUser({ phone })` + `verifyOtp({ type: 'phone_change' })`.
   - Böylece gerçek SMS gitmeden UI başarı göstermeyecek.

3. **Telefon formatını tutarlı yap**
   - Supabase çağrılarına telefon numarası E.164 formatında ve `+` işaretiyle gönderilecek (`+905...`).
   - Mevcut kod bazı yerlerde `+` işaretini siliyor; bu belirsizliği kaldıracağım.

4. **Ayarlar > Profil/Güvenlik doğrulamasını iyileştir**
   - `PhoneVerification` içinde Twilio yapılandırma hataları daha anlaşılır gösterilecek.
   - Başarısız SMS gönderiminde kullanıcıya Supabase Dashboard → Authentication → Providers → Phone → Twilio ayarlarını kontrol etmesi söylenecek.

5. **Gerekli Twilio bilgileri**
   - Kod değişikliği sonrasında hâlâ 20003 gelirse sorun Twilio credentials tarafındadır.
   - Bu durumda Supabase Auth Phone Provider’a şu bilgiler doğru girilmeli:
     - Twilio Account SID
     - Twilio Auth Token
     - Twilio Messaging Service SID veya Twilio From Number
   - Güvenlik nedeniyle bunlar frontend koduna yazılmayacak; Supabase Auth Dashboard’da yapılandırılacak. İstersen ayrıca Lovable Secrets üzerinden edge-function tabanlı ayrı bir Twilio test endpoint’i kurabiliriz, ama Supabase Auth SMS için asıl credential Supabase Auth Provider ayarında olmalı.

## Uygulanacak Dosyalar

- `src/components/settings/TwilioSmsTest.tsx`
- `src/components/settings/PhoneVerification.tsx`
- `src/pages/Login.tsx`

## Beklenen Sonuç

- Twilio credential yanlışsa kullanıcı net şekilde “Twilio kimlik doğrulama hatası / 20003” görür.
- SMS gerçekten gönderilmeden test paneli başarılı göstermez.
- Doğru Supabase Phone + Twilio ayarı yapıldığında kullanıcı Ayarlar ekranında telefonunu SMS koduyla doğrular, sonrasında login ekranında SMS ile giriş yapabilir.
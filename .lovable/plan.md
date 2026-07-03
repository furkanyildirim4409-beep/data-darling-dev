Sorunun ana kaynağı iki nokta:

1. Supabase logundaki `Only an email address or phone number should be provided on verify` hatası, reauthenticate doğrulamasında `/verify` çağrısına yanlış parametre seti gittiğini gösteriyor. Mevcut kod sadece `token + type` gönderiyor; Supabase reauthentication verify için email bilgisini de bekliyor ve aynı anda başka kimlik alanları karışırsa 400 döndürüyor.
2. Modal şu anda 6 hane tamamlanınca otomatik doğruluyor. Kullanıcı kodu düzeltirken veya aynı kod tekrar render tetiklerken gereksiz verify çağrıları oluşabiliyor. Bu da Supabase tarafında rate limit/429 riskini artırıyor.

Uygulama planı:

1. `AthleteDetail.tsx` içinde reauthenticate akışını magic link kullanmadan koruyacağım:
   - `requestOtpForAction` sadece `supabase.auth.reauthenticate()` kullanacak.
   - `signInWithOtp` veya magic link akışı kesinlikle kullanılmayacak.

2. `handleOtpVerify` çağrısını reauthentication için doğru parametrelerle düzenleyeceğim:
   - `supabase.auth.verifyOtp({ email: user.email, token: code, type: 'reauthentication' })`
   - Hataları `getOtpErrorMessage` ile Türkçeleştireceğim.
   - 429/rate limit durumunda kullanıcıya “Tekrar denemek için lütfen 60 saniye bekleyin.” mesajı gösterilecek.

3. Modal tarafında otomatik doğrulamayı kaldıracağım:
   - Kod 6 haneye ulaşınca otomatik `onVerify` çağrısı yapılmayacak.
   - Kullanıcı yalnızca “Doğrula” butonuna basınca tek istek atılacak.
   - Bu, loop ve 429 üreten gereksiz tekrarları engelleyecek.

4. Başarısız kod denemesinde yeniden denemeyi mümkün yapacağım:
   - Yanlış kodda modal açık kalacak.
   - Aynı input kilitlenmeyecek; kullanıcı kodu silip tekrar girebilecek.
   - Aynı kodu butona basarak spamlemeyi engelleyen küçük bir guard kalacak.

5. İptal/kapatma durumunda pending state temizlenecek:
   - `otpModalOpen`, `pendingAction`, `otpLoading` güvenli şekilde resetlenecek.

6. Test/validasyon:
   - Kodda `signInWithOtp` kalmadığını kontrol edeceğim.
   - `verifyOtp` çağrısının `email + token + type: 'reauthentication'` gönderdiğini doğrulayacağım.
   - UI’da yanlış kod denemesinde tek toast/tek request mantığını kontrol edeceğim.
   - Auth e2e bu proje `external_unmanaged` olduğu için canlı oturumla otomatik doğrulanamazsa bunu açıkça belirteceğim; ancak statik ve tarayıcı davranış testini yapacağım.
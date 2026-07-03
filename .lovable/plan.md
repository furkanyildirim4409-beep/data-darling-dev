## Amaç
Hassas işlem (freeze/terminate/refund) onayı için gönderilen e-postayı magic link'ten (`signInWithOtp`) çıkarıp, sadece 6 haneli reauthentication OTP koduna (`supabase.auth.reauthenticate()`) çevirmek ve akışı canlı test etmek.

## Neden
`signInWithOtp` şu an magic link + OTP içeren standart giriş e-postası yolluyor (kullanıcı yeniden oturum açmış gibi olabiliyor). `reauthenticate()` yalnızca kısa süreli 6 haneli reauth kodu gönderir, aktif oturumu bozmaz — bu tam olarak istenen davranış.

## Değişiklikler

### `src/pages/AthleteDetail.tsx`
- `requestOtpForAction` içindeki `supabase.auth.signInWithOtp({...})` çağrısını `supabase.auth.reauthenticate()` ile değiştir.
- `handleOtpVerify` içindeki `verifyOtp` çağrısını şu şekilde güncelle:
  ```ts
  supabase.auth.verifyOtp({ type: 'reauthentication', token: code })
  ```
  (reauthentication type'ı `email` parametresi almaz, sadece token yeter.)
- Hata mesajı map'ini (`getOtpErrorMessage`) olduğu gibi bırak; "60 saniye" ve "geçersiz/süresi dolmuş" Türkçe kalıpları korunur.

### Test (Playwright, headless)
1. Managed Supabase session'ını sandbox env'inden restore et, `/athletes/6a849b37-...` sayfasına git.
2. "Aboneliği Dondur" akışını aç, formu doldur, submit et → OTP modalının açıldığını ve toast'un çıktığını screenshot ile doğrula.
3. Console/network log'larında `reauthenticate` isteğinin 200 döndüğünü ve `verifyOtp` endpoint'inin çağrılmaya hazır olduğunu doğrula.
4. Gerçek OTP kodunu bilemeyeceğimiz için yanlış bir 6 haneli kod gir → "Geçersiz veya süresi dolmuş kod." Türkçe toast'unun geldiğini ve modal'ın loop'a girmediğini (tek istek atıldığını) doğrula.
5. Screenshot'ları `code--view` ile kontrol et.

## Kapsam dışı
- OTP e-posta şablonu (Supabase built-in reauthentication template kullanılacak).
- Diğer sayfalardaki auth akışları.
- `SensitiveActionOtpModal.tsx` — mevcut duplicate-submit guard yeterli.

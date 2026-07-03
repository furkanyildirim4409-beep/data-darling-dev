## Amaç
`SensitiveActionOtpModal` bileşenini `src/pages/AthleteDetail.tsx` içindeki üç hassas işleme (Dondur / Fesih / İade) mevcut DB mantığını değiştirmeden bir OTP kapısı arkasına almak.

## Dosya
Sadece `src/pages/AthleteDetail.tsx` düzenlenecek. Başka dosya oluşturulmaz.

## Değişiklikler

### 1) Yeni state'ler (mevcutların yanına)
```ts
const [otpModalOpen, setOtpModalOpen] = useState(false);
const [pendingAction, setPendingAction] = useState<'freeze' | 'terminate' | 'refund' | null>(null);
const [otpLoading, setOtpLoading] = useState(false);
```

### 2) Mevcut fonksiyonların yeniden adlandırılması
`submitFreeze` → `executeFreeze`, `submitTerminate` → `executeTerminate`, `submitRefund` → `executeRefund`. **İç DB mantığına dokunulmayacak** (Supabase update / refund_requests insert / toast + navigate akışı aynen kalır). Loading state ve dialog kapanışları içeride korunur.

### 3) Yeni "kapı" fonksiyonları
`submitFreeze/Terminate/Refund` artık DB'ye yazmayacak, sadece OTP tetikleyecek:
- İlgili validation'ı (freezeSchema / refund tutarı) burada koruyup önden yapar, hatalıysa çıkar.
- `setPendingAction('freeze' | 'terminate' | 'refund')`
- İlgili onay dialog'unu kapatır (`setFreezeOpen(false)` vb.) — form değerleri korunur, çünkü `execute*` fonksiyonları hâlâ mevcut state'leri okuyacak.
- Koçun e-postasına 6 haneli OTP gönderir:
  ```ts
  const { error } = await supabase.auth.reauthenticate();
  ```
  Bu, aktif oturumdaki kullanıcıya 6 haneli reauth nonce'ı e-posta ile yollar (Supabase Auth built-in). Hata varsa toast ile bildir, akışı iptal et.
- Başarılıysa `setOtpModalOpen(true)`.

### 4) OTP doğrulama & çalıştırma
Modal'a verilecek `onVerify` handler'ı:
```ts
const handleOtpVerify = async (code: string) => {
  if (!user?.email || !pendingAction) return;
  setOtpLoading(true);
  try {
    const { error } = await supabase.auth.verifyOtp({
      email: user.email,
      token: code,
      type: 'reauthentication',
    });
    if (error) { toast.error('Geçersiz Kod'); return; }
    setOtpModalOpen(false);
    if (pendingAction === 'freeze') await executeFreeze();
    else if (pendingAction === 'terminate') await executeTerminate();
    else if (pendingAction === 'refund') await executeRefund();
  } finally {
    setOtpLoading(false);
    setPendingAction(null);
  }
};
```

### 5) Modal render
Sayfanın JSX'inin sonuna (mevcut dialogların yanına):
```tsx
<SensitiveActionOtpModal
  isOpen={otpModalOpen}
  onClose={() => { setOtpModalOpen(false); setPendingAction(null); }}
  onVerify={handleOtpVerify}
  isLoading={otpLoading}
  actionName={
    pendingAction === 'freeze' ? 'Üyelik Dondurma'
    : pendingAction === 'terminate' ? 'Sözleşme Feshi'
    : pendingAction === 'refund' ? 'İade Talebi'
    : ''
  }
  athleteName={athlete?.full_name ?? 'sporcu'}
/>
```
Import: `import { SensitiveActionOtpModal } from "@/components/coach/SensitiveActionOtpModal";`

## Notlar
- **DB mantığı değişmiyor** — `execute*` fonksiyonları eskisiyle bit-bit aynı.
- OTP kanalı olarak Supabase'in kendi `auth.reauthenticate()` + `verifyOtp({ type: 'reauthentication' })` çifti kullanılıyor (istekte belirtilen "mevcut reauthentication OTP metodu"). Bu, giriş yapmış koçun e-postasına 6 haneli nonce yollar ve harici bir edge function veya secret gerektirmez.
- OTP butonu ilk basıldığında dialog kapanmadan önce validation tekrar çalıştığı için geçersiz form ile OTP gönderilmez.
- `handleUnfreezeAthlete` (dondurmayı kaldırma) OTP kapısına dahil edilmedi — istek yalnızca freeze/terminate/refund'ı kapsıyor.

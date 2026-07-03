## Plan: SensitiveActionOtpModal Bileşeni

### Hedef
Dynabolic Elite temasına uygun, shadcn/ui Dialog ve InputOTP tabanlı, bağımsız bir 6 haneli OTP doğrulama modalı oluşturmak.

### Dosya
- `src/components/coach/SensitiveActionOtpModal.tsx` (yeni dizin + dosya)

### API (Props)
```ts
interface SensitiveActionOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<void>;
  actionName: string;
  athleteName: string;
  isLoading: boolean;
}
```

### Tasarım ve Davranış
- **Modal**: shadcn/ui `Dialog` kullanılacak; arka plan `bg-black/80`, içerik kartı `bg-card/95` + `border-border` glass efekti.
- **Başlık**: "Güvenlik Doğrulaması"
- **Açıklama**: `'{athleteName} adlı sporcu için {actionName} işlemi başlattınız. Lütfen e-postanıza gönderilen 6 haneli güvenlik kodunu girin.'`
- **Input**: shadcn/ui `InputOTP` (6 slot). Aktif/odaklanan kutucuklarda Neon Lime halka efekti (`ring-lime-neon` / `border-lime-neon`).
- **Submit**: 6 hane tamamlandığında otomatik `onVerify(code)` tetiklenecek. Ayrıca görsel bir "Doğrula" butonu (`bg-lime-neon text-black`) da olacak.
- **Loading**: `isLoading === true` iken InputOTP ve buton `disabled`; buton içinde `Loader2` dönen spinner gösterilecek.
- **Kapatma**: `onClose` prop'u Dialog'un `onOpenChange`'ine ve iptal/çarpı butonuna bağlanacak.

### Kullanılan Mevcut Bileşenler
- `src/components/ui/dialog.tsx`
- `src/components/ui/input-otp.tsx`
- `src/components/ui/button.tsx`
- `lucide-react` (Loader2 ikonu)

### Not
Bu sadece bir sunum (presentation) bileşenidir. OTP kodunun e-posta ile gönderilmesi, backend doğrulaması veya güvenlik politikaları bu planın kapsamı dışındadır; `onVerify` callback'i dışarıdan sağlanır.

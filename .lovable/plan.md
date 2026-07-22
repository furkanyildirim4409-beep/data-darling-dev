## 1) `MetabolicFlux.tsx` — yerel gün anahtarı
- `date-fns`'ten `format` import et.
- `dayKey`'i şu şekilde değiştir:
  ```ts
  function dayKey(d: Date) {
    return format(d, "yyyy-MM-dd");
  }
  ```
Diğer akış aynı kalır (satır 100 ve 114 zaten `dayKey(...)` çağırıyor).

## 2) `SessionsDialog.tsx` — yerel bugün + effect deps
- `date-fns`'ten `format` import et.
- Satır 48:
  ```ts
  const today = format(new Date(), "yyyy-MM-dd");
  ```
- Satır 94: effect deps'i `[open, user, activeCoachId]` yap.

Hiç şema/UI değişikliği yok.

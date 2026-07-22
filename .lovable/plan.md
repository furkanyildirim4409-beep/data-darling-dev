## Sorun
1. `AssignSupplementDialog:118` — `Number(e.target.value) || 1` → alanı silmeye çalışınca 1'e sıçrıyor, "10" yazmak için "1" yazınca da anlık koruma tetikleniyor.
2. `NutritionTab:363` — `parseInt(e.target.value) || 0` → aynı desen; ayrıca `parseInt` ondalık girişini kırpar.
3. `ProductEditor:154` — `Number(e.target.value)` → boş input `0` oluyor, ondalık ("19.9" → yazarken "19." reddediliyor).
4. `SupplementsPanel.handleDelete` — tek tıkta siliyor, onay yok.
5. `ProductEditor.handleFileSelect` — `URL.createObjectURL` çağrısı `previewUrl` değişirken/unmount'ta `URL.revokeObjectURL` ile bırakılmıyor → bellek sızıntısı.

## Çözüm

### 1. String-backed numeric inputs (NutritionBuilder deseni)
Üç dosyada da input string state'te tutulur, submit/persist anında `Number()` ile coerce edilir. Boş string'e izin verilir; kayıt anında NaN/negatif için sane fallback uygulanır.

- **`AssignSupplementDialog.tsx`**
  - `totalServings` state: `useState<string>("30")`.
  - `onChange`: sadece rakam kabul (`e.target.value.replace(/[^\d]/g, "")`).
  - `handleAssign` içinde: `const total = Math.max(1, parseInt(totalServings, 10) || 30);` → payload'a `total`.

- **`NutritionTab.tsx`** (edit form)
  - `formValues` içindeki 4 makro alanı halihazırda number; bunları `Record<Key, string>`'e çevirmek yerine minimum invaziv yol: input `value = formValues[key] === 0 ? "" : String(formValues[key])`, `onChange` string parse ederken boş girişi `0` yerine mevcut state'i koru:
    ```ts
    onChange={(e) => {
      const raw = e.target.value;
      if (raw === "") { setFormValues(p => ({ ...p, [field.key]: 0 })); return; }
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n) && n >= 0) setFormValues(p => ({ ...p, [field.key]: n }));
    }}
    ```
  - Bu, silme/rakam düzeltme akışını bloklamaz; kaydet anında değer zaten number.

- **`ProductEditor.tsx`** (price)
  - Local `priceInput` state (string), initial `String(formData.price ?? "")`.
  - `onChange`: `/^\d*[.,]?\d{0,2}$/` regex ile ondalık kabul, virgülü noktaya normalize.
  - `onBlur`: `const n = Number(priceInput.replace(",", "."));` → `updateField("price", Number.isFinite(n) && n >= 0 ? n : 0)` sonra `handleBlur()`.
  - Ayrıca `formData.price` dışarıdan değişirse `useEffect` ile `priceInput` senkronu.

### 2. Silme onayı — `SupplementsPanel.tsx`
`AlertDialog` (shadcn) ile sarılı bir `AlertDialogTrigger` çöp kutusu butonunun yerini alır. State: `deleteTargetId: string | null`.

- Trigger `setDeleteTargetId(sup.id)`.
- `AlertDialogContent`: başlık "Takviyeyi sil?", açıklama supplement adı ile, `AlertDialogAction` `variant="destructive"` — onayda `handleDelete(deleteTargetId)` çağırıp state'i sıfırlar.
- Mevcut `handleDelete` mantığı korunur; yalnızca çağrım gate'lenir.

### 3. Object URL revoke — `ProductEditor.tsx`
- `handleFileSelect` yeni URL üretmeden önce mevcut `previewUrl` varsa `URL.revokeObjectURL(previewUrl)`.
- `useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);` — cleanup her değişimde ve unmount'ta çalışır.
- Not: cleanup, önceki URL'yi kapatır çünkü closure eski değeri yakalar; standart pattern.

## Kapsam dışı
- DB/tip değişikliği yok.
- Görsel/copy değişikliği yok, yalnızca davranış düzeltmeleri.
- Diğer `Number(e.target.value)` çağrıları (kapsam dışı bileşenler) bu turda dokunulmaz.

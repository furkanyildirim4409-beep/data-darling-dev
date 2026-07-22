## Sorun
`BuilderExercise.reps` `number`. `handleEditProgram` (satır 170) ve `handleSaveProgramAsTemplate` (satır 866) DB'den gelen `"8-12"` string'ini `parseInt` ile 8'e düşürüyor. Kaydederken `String(ex.reps)` yazıldığı için "8" olarak geri yazılıyor → aralık her düzenlemede kayboluyor. AI import (satır 475) de aynı desende.

## Düzeltme (frontend-only)

### 1) `src/components/program-architect/WorkoutBuilder.tsx`
- Satır 65: `reps: number;` → `reps: number | string;`

### 2) `src/components/program-architect/SortableExerciseItem.tsx`
- Satır 144-145 input'unu `type="text"` yap (aralık/`AMRAP` gibi değerleri kabul etsin):
  ```tsx
  <Input type="text" inputMode="text" value={String(exercise.reps ?? "")}
    onChange={(e) => onUpdateExercise(dayIndex, exercise.id, "reps", e.target.value)}
  />
  ```

### 3) `src/pages/Programs.tsx`
- Satır 170: `reps: parseInt(ex.reps ?? "10", 10)` → `reps: ex.reps ?? 10`
- Satır 475 (AI import): `reps: parseInt(String(ex.reps).split("-")[0]) || 10` → `reps: ex.reps ?? 10`
- Satır 866 (dashboard'dan şablon çıkarma): `reps: parseInt(ex.reps ?? "10", 10)` → `reps: ex.reps ?? 10`

### Değişmeyen
- Save akışı zaten `reps: String(ex.reps)` yapıyor (satır 761) — string olduğu gibi yazılır.
- Yeni egzersiz ekleme (satır 235) `reps: 10` (numeric) — union tipe uyar.
- Şablon load (satır 815) zaten `ex.reps ?? 10` — string ise korur.

## Notlar
- DB şeması etkilenmez (`exercises.reps` zaten text).
- `type="number"` yerine `type="text"` yapıldığı için `min/max` kaldırılır; kısa yardımcı placeholder "10 veya 8-12" eklenebilir.

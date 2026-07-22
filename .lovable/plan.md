## 1) `AssignTrainingDialog.tsx` — delete-then-insert
`handleAssign` içinde, `insert`'ten hemen önce, atanacak aralık için mevcut satırları temizle:

```ts
const startStr = format(start, "yyyy-MM-dd");
const endStr = format(addDays(start, weeks * 7 - 1), "yyyy-MM-dd");

const { error: delError } = await supabase
  .from("assigned_workouts")
  .delete()
  .eq("athlete_id", athleteId)
  .gte("scheduled_date", startStr)
  .lte("scheduled_date", endStr);
if (delError) { toast destructive; setAssigning(null); return; }
```

Sonra mevcut insert akışı çalışır. `addDays` import edilir. Hata durumunda toast + erken çıkış.

## 2) `ReplaceProgramDialog.tsx` — Pazartesi snap
Takvim `onSelect` çağrısı `startOfWeek(d, { weekStartsOn: 1 })` uygulanarak yazılır:

```tsx
onSelect={(d) => d && setStartDate(startOfWeek(d, { weekStartsOn: 1 }))}
```

`startOfWeek` zaten import edilmiş.

## 3) `NutritionTab.tsx` — gelecekteki `assigned_diet_days` temizliği
`handleRemoveTemplate` içinde `nutrition_targets` güncellemesi başarılı olduktan sonra bugünden itibaren atanan diyet günlerini de sil:

```ts
const today = format(new Date(), "yyyy-MM-dd");
const { error: daysErr } = await supabase
  .from("assigned_diet_days")
  .delete()
  .eq("athlete_id", athleteId)
  .gte("target_date", today);
if (daysErr) { toast destructive; return; }
```

Hem başarı toast'u hem `fetchTargets()` bu adım başarılıysa çağrılır; herhangi biri hata verirse destructive toast ile durur ve `setRemovingTemplate(false)` çağrılır.

## Notlar
- Hiçbir DB şeması değişikliği yok.
- `AssignTrainingDialog` toplu silme aralığı yalnızca atama penceresi (weeks*7 gün) ile sınırlıdır; önceki başka programlara ait geçmiş satırlara dokunmaz.

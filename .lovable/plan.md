## Amaç
Diyet şablonu atamada kısmi başarısızlık durumunda sporcunun boş bir diyet göstergesiyle kalmasını önle. Hata net şekilde bildirilsin ve tüm işlem atomik olsun.

## Değişiklikler

### 1) DB — Yeni RPC: `public.assign_diet_template`
Tek transaction içinde:
1. Verilen `athlete_id` için `startDate`'den itibaren tüm `assigned_diet_days` satırlarını siler.
2. Template'in dolu günlerine göre yeni `assigned_diet_days` satırlarını üretir ve `INSERT` eder (generate_series ile).
3. `nutrition_targets` upsert (active_diet_template_id, diet_start_date, diet_duration_weeks).
4. Yetki kontrolü: caller `auth.uid()` = coach_id veya `is_active_team_member_of(coach_id)` — yoksa `RAISE EXCEPTION`.
5. Herhangi bir adım hata verirse tüm transaction ROLLBACK olur; eski `assigned_diet_days` korunur.

Parametreler: `_athlete_id uuid, _coach_id uuid, _template_id uuid, _start_date date, _duration_weeks int`.

Migration ayrıca RPC'ye `GRANT EXECUTE ... TO authenticated` verir.

### 2) `src/components/athlete-detail/AssignDietTemplateDialog.tsx` — `handleAssign`
- Mevcut `nutrition_targets` upsert + `generateAssignedDietDays` iki adımını kaldır.
- Yerine tek `supabase.rpc('assign_diet_template', {...})` çağrısı.
- Hata dönerse: `toast({ title: "Atama başarısız", description: error.message, variant: "destructive" })`, `setAssigning(null)` ve **dialog kapanmaz**, başarı toast'u gösterilmez.
- Başarılı olursa mevcut başarı akışı (toast + `onAssigned()` + `onOpenChange(false)`).

### 3) `src/components/program-architect/AssignDietTemplateBulkDialog.tsx`
Aynı RPC'yi her seçili sporcu için çağır. Herhangi biri hata verirse:
- Başarılı/başarısız sayaçları toparlansın.
- Hata varsa `destructive` toast; hepsi başarılıysa dialog kapanır.

### 4) `src/utils/dietAssignment.ts`
Artık kullanılmıyorsa kaldır; başka yerlerde çağrılıyorsa RPC'yi saran ince bir wrapper haline getir (delete+insert yok).

## Teknik notlar
- RPC `SECURITY DEFINER` + `SET search_path = public`.
- `assigned_diet_days` üretimi SQL tarafında yapılırken template'in dolu günleri `SELECT DISTINCT day_number FROM diet_template_foods WHERE template_id = _template_id` ile alınır; hedef tarihler `generate_series(_start_date, _start_date + (_duration_weeks*7 - 1), interval '1 day')` üzerinden gün numarasına göre filtrelenir.

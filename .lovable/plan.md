
Hedef: “silent update” durumunu görünür hale getirip, gelecekteki takvim atamalarını klona zorla yönlendirmek; RLS kaynaklı sessiz 0-row güncellemeleri teşhis edilebilir yapmak.

1) Durum Tespiti (koddan çıkan net bulgular)
- `src/services/ActionEngine.ts` içinde Program Step F hâlâ `eq("program_id", sourceProgramId)` filtresi kullanıyor; bu filtre geçmişteki uyumsuz/eskimiş atamalarda 0 satır döndürebilir.
- `assigned_workouts` için RLS update policy’leri var; bu yüzden sorun yalnızca “policy yok” değil, aynı zamanda veri/predicate uyumsuzluğu (örn. `coach_id` null legacy satırlar, farklı `program_id`) olabilir.
- Nutrition tarafında `nutrition_targets` update’i hata fırlatıyor ama “kaç satır gerçekten güncellendi” doğrulaması yok; sessiz 0-row görünmez kalabiliyor.

2) Uygulama Planı

A. Migration: `assigned_workouts` UPDATE yetkisini sessiz blokları azaltacak şekilde güçlendirme
- Yeni migration dosyası:
  - `ALTER TABLE public.assigned_workouts ENABLE ROW LEVEL SECURITY;` (idempotent güvence)
  - Yeni bir permissive UPDATE policy ekle (mevcutları bozmadan):
    - `USING (coach_id = auth.uid() OR public.is_coach_of(athlete_id))`
    - `WITH CHECK (coach_id = auth.uid() OR public.is_coach_of(athlete_id))`
- Böylece `coach_id` eksik/legacy satırlarda da koç, atlet sahipliği üzerinden update edebilir.
- Not: Mevcut policy isim çakışmasını önlemek için yeni unique policy adı kullanılacak.

B. Program Assignment Ultimate Hotfix: `forkAndMutateProgram` Step F
- Mevcut program-id kısıtını kaldır:
  - `eq("athlete_id", athleteId)`
  - `gte("scheduled_date", todayStr)`
- Güncellemeden sonra `.select("id, scheduled_date, program_id")` ile dönen satırları zorla al.
- Hata yönetimi:
  - `assignUpdateErr` varsa `throw new Error(...)` (rollback tetiklenir).
  - `updatedAssignments.length === 0` ise `console.warn(...)` (rollback yok; teşhis var).
  - >0 ise `console.log(...)` ile başarı adedi yaz.
- Amaç: sessiz başarısızlığı görünür yapmak ve geleceğe dönük tüm takvimi yeni klona taşımak.

C. Nutrition tarafında eşdeğer doğrulama
- `nutrition_targets` update’ini `.select("id, active_diet_template_id")` ile doğrula.
- `assignErr` varsa throw.
- 0-row ise `console.warn(...)` (RLS/predicate mismatch göstergesi).
- Ek tutarlılık: `athlete_diet_assignments` tablosunda `template_id` eski şablondan yeniye update + `.select("id")` doğrulaması (varsa güncellensin, yoksa warn). Böylece ActiveBlocks’ta eski/yeni plan çakışması engellenir.

3) Teknik Detaylar (özet)
- Program update filtresi:
  - Eski: `athlete_id + sourceProgramId + date`
  - Yeni: `athlete_id + date`
- Doğrulama yöntemi:
  - Supabase `update(...).select(...)` ile affected rows alınır.
  - `error` => hard fail, `0 row` => diagnostic warn.
- RLS güçlendirme:
  - Koç sahipliği doğrulaması için `is_coach_of(athlete_id)` kullanımı (recursive policy riski yok, mevcut security definer fonksiyon kullanılıyor).

4) Doğrulama/Test Planı
- Senaryo 1: AI mutasyon tetikle → `assigned_workouts` içinde `scheduled_date >= today` satırlarının `program_id` yeni klona geçmiş olmalı.
- Senaryo 2: Gelecek atama yoksa işlem rollback olmamalı; console’da “0 satır” uyarısı görülmeli.
- Senaryo 3: Nutrition mutasyonunda `nutrition_targets.active_diet_template_id` yeni template’e dönmeli; varsa `athlete_diet_assignments` de eşleşmeli.
- Senaryo 4: RLS kaynaklı blok durumunda artık sessiz kalmamalı; hata/warn ile teşhis edilebilir olmalı.

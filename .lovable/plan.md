## Amaç
Phase 4: Satın alma öncesi Athlete Intake Form verilerini güvenli şekilde göstermek ve paket seviyesini (tier) sporcu satırlarında/detayında görsel rozetle işaretlemek.

## 1. Yeni Component – `src/components/athlete-detail/IntakeFormTab.tsx`
- Props: `athleteId: string`
- `useAuth()` ile `user.id` (aktif koç kimliği için `activeCoachId ?? user.id`) alınır.
- Sorgu:
  ```ts
  supabase.from('athlete_intake_forms')
    .select('email, phone, medical_conditions, medications, created_at, agreement_accepted, kvkk_accepted')
    .eq('athlete_id', athleteId)
    .eq('coach_id', activeCoachId)   // RLS'i client tarafında da zorla
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  ```
- Durumlar:
  - Loading → Skeleton kartlar
  - Kayıt yok → boş-state kart ("Sporcu satın alma öncesi form doldurmamış")
  - Kayıt var → iki `<Card>`:
    - **İletişim Kartı**: email + phone (kopyala butonu opsiyonel, `Mail`/`Phone` icon).
    - **Sağlık Kartı**: medical_conditions, medications (whitespace-preserve, boşsa "Belirtilmemiş").
  - Alt satırda küçük meta: form gönderim tarihi, KVKK ✔, Sözleşme ✔ rozetleri.
- Tümüyle read-only; edit butonu yok. Salt bilgi.

## 2. `src/pages/AthleteDetail.tsx`
- Import: `HeartPulse` iconu ve `IntakeFormTab`.
- `TabsList`e yeni trigger:
  ```
  <TabsTrigger value="intake">Sağlık & İletişim Formu</TabsTrigger>
  ```
- Yeni `<TabsContent value="intake">` içinde `<IntakeFormTab athleteId={athlete.id} />`.
- Aynı sayfada başlığın (isim) yanına Paket Tier Rozeti yerleştirilir (bkz. §3).

## 3. Paket Tier Rozeti
Not: Kod tabanında `coach_athletes` tablosu yok; `profiles.active_package_level` alanı (`'elite' | 'pro' | 'standard'`) bu iş için kullanılır (Faz 2'de handle_coaching_order_paid tarafından set ediliyor). Rozet bu alandan türetilir. Eğer alan boşsa hiçbir şey render edilmez (empty state gizlenir, dolgu göstermeyiz).

Yeni yardımcı: `src/components/athletes/PackageTierBadge.tsx`
- Props: `level?: string | null`
- Mapping:
  - `elite` → amber/gold (`bg-amber-500/15 text-amber-400 border-amber-500/40`) + Crown icon
  - `pro` → silver/gray (`bg-slate-400/15 text-slate-200 border-slate-400/40`) + Star icon
  - `standard` → muted (`bg-muted text-muted-foreground border-border`) + Circle icon
  - Diğer/null → null döner
- Küçük `Badge` (shadcn) tabanlı, `text-[10px] uppercase tracking-widest`.

Kullanım noktaları:
- `src/components/athletes/AthleteTableRow.tsx` — sporcu adının hemen yanına eklenir. `athlete` prop'una `package_level` alanı geçilmesi gerektiğinden `useAthletes` hook'unda alan seçilmiş olmalı (kontrol edilecek; yoksa select listesine `active_package_level` eklenir ve `Athlete` tipine `packageLevel?: string` alanı düşer).
- `src/pages/AthleteDetail.tsx` — üst başlıkta ad + mevcut tier badge'inin yanına eklenir (mevcut `Tier` gösterimini bozmadan).

## 4. Güvenlik
- Tüm `athlete_intake_forms` sorguları `.eq('coach_id', activeCoachId)` filtresi taşır. Bu, RLS'in yanında client-side savunmadır; yanlış coach'un DevTools ile başka athleteId'yi denemesini önler.
- Yalnızca listede belirtilen alanlar `select` edilir (agreement/kvkk rozet için gerekli; email/phone hassas kabul edilir ama zaten koçun görmesi gereken bilgidir).
- Sub-coach senaryosu: `activeCoachId` head coach id'sine döner (memory kuralı), böylece ajans altındaki sub-coach da erişebilir.

## 5. Data akışı için gerekli küçük değişiklikler
- `src/hooks/useAthletes.ts` (kontrol edilecek): select listesine `active_package_level` eklenir; dönen sporcu nesnesine `packageLevel: p.active_package_level ?? null` eşlenir.
- `src/types/shared-models.ts` içindeki `Athlete` interface'ine `packageLevel?: string | null` eklenir.

## Dokunulan dosyalar
- `src/components/athlete-detail/IntakeFormTab.tsx` (yeni)
- `src/components/athletes/PackageTierBadge.tsx` (yeni)
- `src/pages/AthleteDetail.tsx` (tab + badge)
- `src/components/athletes/AthleteTableRow.tsx` (badge)
- `src/hooks/useAthletes.ts` (packageLevel alanı — gerekiyorsa)
- `src/types/shared-models.ts` (Athlete interface alanı)

## Kapsam dışı
- Intake form düzenleme akışı (sporcu doldurur, koç düzenlemez)
- Form geçmişi listesi (yalnızca en son kayıt gösterilir)
- Paket tier yükseltme/düşürme aksiyonları

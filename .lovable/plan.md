## Amaç
Business.tsx > "Bugünün Programı" ve `SessionSchedulerDialog` gerçek DB verisiyle çalışsın. Hardcoded seed'ler kalksın; scheduler'da eklenen seanslar `coach_sessions` tablosuna kalıcı yazılsın, silme de DB'ye işlensin.

## 1) DB — Yeni tablo `coach_sessions`
Migration, standart 4-adım kalıp:

Sütunlar (domain):
- `coach_id uuid` (owner)
- `athlete_id uuid null` (grup seansları için null olabilir)
- `athlete_label text` (grup / manuel isim için)
- `session_type text` (pt | consultation | group | checkin)
- `scheduled_date date`
- `scheduled_time time`
- `duration_minutes int` (30/45/60/90)
- `notes text null`
- standart `id`, `created_at`, `updated_at` + trigger

GRANT'lar: `authenticated` full CRUD, `service_role` ALL.

RLS:
- Coach kendi satırlarını yönetir: `coach_id = auth.uid()` veya `is_active_team_member_of(coach_id)` (mevcut agency modeli).
- Athlete kendi seansını okuyabilir: `athlete_id = auth.uid()` (SELECT).

Realtime gerekmez.

## 2) Hook — `src/hooks/useCoachSessions.ts`
- `useCoachSessions(coachId, date?)` → o tarihe ait seansları çeker (default: bugün).
- `useCoachSessionsWeek(coachId, weekStartDate)` → hafta grid'i için 7 günlük fetch.
- Mutations: `createSession`, `deleteSession`. React Query cache invalidation.

## 3) `SessionSchedulerDialog.tsx` — tamamen DB destekli
- Hardcoded `clients` ve seed `sessions` array'i kaldırılır.
- Sporcu listesi `profiles`'tan `role='athlete' AND coach_id = activeCoachId` ile çekilir + sabit "Grup Antrenmanı" seçeneği (athlete_id null, athlete_label="Grup Antrenmanı").
- Grid, `weekStartDate` state'i üzerinden `useCoachSessionsWeek` ile beslenir. Bugün için hafta içi doğru gün indeksi hesaplanır (Pazartesi=0).
- `handleCreateSession` → `createSession` mutation (destructive toast on error, dialog form reset on success).
- `handleRemoveSession` → `deleteSession` mutation.
- Prop `onSessionCreated` kaldırılır (parent artık DB'den yeniler).

## 4) `Business.tsx` — hardcoded seed kaldırılır
- `initialSessions`, `Session` interface, `sessions` state ve `handleSessionCreated` silinir.
- Bugünün programı bölümü `useCoachSessions(activeCoachId, today)` sonucuyla render edilir. Time'a göre sıralı gösterim; loading state; boş durumda "Bugün seans yok" satırı.
- `<SessionSchedulerDialog>` yalnızca `open`/`onOpenChange` alır.

## Notlar
- Sporcu isimleri profiles'tan alındığı için `athlete_label` sadece grup/serbest metin için yedek; UI'da `athlete_id` varsa join'lenmiş `full_name`, yoksa `athlete_label` gösterilir.
- Tarih/saat gösterimlerinde `date-fns` formatlaması korunur; `time` alanı `HH:mm`.

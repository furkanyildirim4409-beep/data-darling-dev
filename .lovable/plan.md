## Aksiyon Defteri (Action Ledger) — Kalıcı Müdahale Takip Sistemi

AI Doktor Radarı kart akışını, koçun her bulguyu "Listeye Ekle" veya "Yok Say" ile filtreleyebildiği ve sonradan "Çözüldü/Çözülmedi" olarak işaretleyebildiği bir kalıcı eylem defterine dönüştürüyoruz.

### 1. Veritabanı (migration)

Yeni tablo `coach_action_ledger`:
- `coach_id` (auth.uid), `athlete_id` (profiles), `issue_type`, `issue_title`, `issue_details jsonb`
- `status`: `pending` | `resolved` | `failed` | `ignored` (varsayılan `pending`)
- `source_insight_id uuid` — `ai_weekly_analyses` kaydına referans (aynı bulguyu tekrar göstermemek için unique `(coach_id, source_insight_id)`)
- `created_at`, `updated_at` + `touch_updated_at` trigger
- GRANT (authenticated + service_role), RLS: koç sadece kendi `coach_id` satırlarını görür/yazar; sub-coach `get_my_head_coach_id()` ile head coach kapsamına erişir
- Realtime publication eklenir

### 2. `AiDoctorRadar.tsx` — Bulgu Filtreleme

- Mevcut sporcu kartına hover/click ile **dark mini-popover** (Radix Popover) açılır: iki buton — `[Yok Say]` ve `[Listeye Ekle]`
- Sporcunun tüm aktif bulgu başlıkları popover içinde listelenir (tek tek veya toplu işlem)
- `Yok Say` → `coach_action_ledger` satırı `status='ignored'` ile insert
- `Listeye Ekle` → `status='pending'` ile insert (athlete_id + issue_title + issue_details + source_insight_id)
- Eklenen/yok sayılan sporcular Framer Motion `AnimatePresence` ile collapse animasyonu ile akıştan çıkar
- Halihazırda `ignored` veya `pending/resolved/failed` durumdaki insight'lar liste sorgusundan filtrelenir

### 3. Yeni bileşen: `ActionLedgerDesk.tsx` ("Kritik Masası & Takip Defteri")

`CommandCenter.tsx`'de `AiDoctorRadar` ile `RiskRadar` arasına yerleştirilir.

- Üstte özet rozetler: Bekleyen / Çözüldü / Çözülmedi sayıları
- Sadece `status='pending'` satırları olan sporcular listelenir (athlete_id ile gruplanır)
- shadcn `Accordion` ile sporcu satırı tıklanınca dikey bento yığını açılır:
  - Her ledger satırı için başlık + detay + iki micro-buton:
    - 🟢 **Çözüldü** → `update status='resolved'`
    - 🔴 **Çözülmedi** → `update status='failed'`
- Mutasyon sonrası: optimistic UI + supabase realtime channel ile otomatik invalidation
- Boş durum: "Henüz takip listesinde bulgu yok" mesajı

### 4. Teknik notlar

- Bulgu key'i: `source_insight_id` üzerinden tekilleştirme (aynı insight tekrar listeye eklenemez)
- `useAuth().isSubCoach` ve `teamMemberPermissions !== 'full'` durumunda `team_member_athletes` kapsam filtresi uygulanır (mevcut AiDoctorRadar deseni)
- Realtime subscription: `coach_action_ledger` postgres_changes → state refetch (proje kuralı: `.on()` → `.subscribe()` sırası, `removeChannel` cleanup)
- TypeScript: tüm satırlar `Database['public']['Tables']['coach_action_ledger']` tipinden türetilir
- Tasarım tokenları: mevcut `bg-destructive`, `bg-success`, `glass`, `border-border` semantik tokenları; ham renk yok

### Dokunulacak dosyalar

```text
+ supabase/migrations/<new>.sql              (CREATE TABLE + GRANT + RLS + trigger)
+ src/components/dashboard/ActionLedgerDesk.tsx
~ src/components/dashboard/AiDoctorRadar.tsx (popover + ignore/add aksiyonları)
~ src/pages/CommandCenter.tsx                (ActionLedgerDesk yerleştirme)
```

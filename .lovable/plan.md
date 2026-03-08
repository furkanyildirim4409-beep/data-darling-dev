

# Dashboard'u Canlı Supabase Verisine Bağlama Planı

## Mevcut Durum

- **`useDashboardData.ts`**: Zaten Supabase'den gerçek veri çekiyor (profiles, assigned_workouts, daily_checkins). Ancak **Realtime subscription yok** — sadece ilk yüklemede veri geliyor.
- **`useActionStream.ts`**: Zaten Supabase'den gerçek veri çekiyor VE realtime subscription var (workout_logs, daily_checkins INSERT).
- **`SessionsDialog.tsx`**: Tamamen **mock veri** kullanıyor — `mockSessions` hardcoded dizisi.
- **ActionStream**: Bio-coins bilgisi gösterilmiyor (`bio_coins_earned` alanı workout_logs tablosunda var ama kullanılmıyor).

## Yapılacaklar

### 1. `useDashboardData.ts` — Realtime Subscription Ekle
- `supabase.channel("dashboard-realtime")` ile iki dinleyici ekle:
  - `workout_logs` INSERT → koçun sporcularından biri antrenman logladığında `fetchAll()` yeniden çağrılsın
  - `profiles` UPDATE → bir sporcunun `readiness_score` güncellendiğinde otomatik yenilensin
- `fetchAll` fonksiyonunu `useCallback` ile sar, realtime handler'dan çağrılabilir olsun
- Cleanup: `useEffect` return'da channel'ı kaldır

### 2. `SessionsDialog.tsx` — Mock Veriyi Kaldır, Supabase'e Bağla
- `mockSessions` dizisini sil
- `assigned_workouts` tablosundan bugünün seanslarını çek (`scheduled_date = today`, `coach_id = auth.uid()`)
- Athlete isimlerini `profiles` tablosundan join ile getir (athlete_id üzerinden ikinci sorgu)
- Status mantığı: `completed`, `pending` (upcoming), saat bilgisi `created_at`'tan türetilsin

### 3. `useActionStream.ts` — Bio-Coins Gösterimi
- Workout log mesajlarına `bio_coins_earned` bilgisini ekle: `"… tamamladı → +15 🪙"`
- Fetch sorgusuna `bio_coins_earned` alanını ekle

### 4. Temizlik
- Dashboard bileşenlerinde kalan mock import veya sabit yoksa doğrula (CommandCenter.tsx zaten temiz)

## Teknik Detay

```text
useDashboardData.ts
├── fetchAll() → useCallback ile sarılacak
├── useEffect: supabase.channel("dashboard-realtime")
│   ├── workout_logs INSERT → fetchAll()
│   └── profiles UPDATE → fetchAll()
└── cleanup: removeChannel

SessionsDialog.tsx
├── Props: open, onOpenChange
├── Internal state: sessions[], isLoading
├── useEffect: fetch assigned_workouts + profiles (today, coach_id)
└── Render: gerçek veriden liste

useActionStream.ts
├── workout mesajına bio_coins_earned ekle
└── fetch sorgusuna bio_coins_earned alanı ekle
```

## Dosya Değişiklikleri

| Dosya | İşlem |
|-------|-------|
| `src/hooks/useDashboardData.ts` | Realtime channel ekle, fetchAll'ı useCallback yap |
| `src/components/dashboard/SessionsDialog.tsx` | Mock sil, Supabase'den assigned_workouts çek |
| `src/hooks/useActionStream.ts` | bio_coins_earned alanını ekle ve mesajda göster |


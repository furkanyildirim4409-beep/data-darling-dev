

## Sağlık Radarını Gerçek Verilerle Besleme

### Mevcut Durum
- `daily_checkins` tablosundan `sleep`, `stress`, `mood`, `soreness` zaten çekiliyor ama fallback değerlerle maskeleniyor (7, 4, 7, 3 gibi sabit değerler)
- `digestion` (sindirim) için hiçbir veri kaynağı yok, sabit 8 olarak hardcoded

### Plan

**1. Migration: `daily_checkins` tablosuna `digestion` kolonu ekle**
- `digestion integer nullable default null` — 1-10 arası sindirim skoru
- Mevcut check-in verilerini bozmaz

**2. `AthleteDetail.tsx` — Gerçek veri kullanımı**
- Fallback değerleri kaldır, `latestCheckIn` null ise `null` dönsün
- `wellnessData` hesaplamasını güncelle:
  - `sleep`: checkin verisi veya `null`
  - `stress`: checkin verisi veya `null`
  - `mood`: checkin verisi veya `null`
  - `soreness`: checkin verisi veya `null`
  - `digestion`: checkin verisi veya `null`
- Check-in sorgusuna `digestion` alanını ekle
- `CheckInData` interface'ine `digestion` ekle

**3. `WellnessRadar.tsx` — Null handling**
- Props interface'ini `number | null` olarak güncelle
- Null olan değerleri 0 veya gri olarak göster
- "Veri yok" durumunu alt stat kartlarında belirt (ör. "-" göster)
- Check-in verisi hiç yoksa "Check-in verisi bulunamadı" mesajı göster

### Dosya Değişiklikleri
- **Migration**: `daily_checkins` tablosuna `digestion` kolonu
- **`src/pages/AthleteDetail.tsx`**: CheckInData interface + wellnessData hesaplama + sorgu güncelleme
- **`src/components/athlete-detail/WellnessRadar.tsx`**: Nullable prop desteği + boş durum UI


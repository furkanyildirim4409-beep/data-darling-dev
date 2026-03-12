

## Kan Tahlili Paneli — Gerçek Veri Entegrasyonu

### Mevcut Durum
- `BloodworkPanel.tsx`: Tamamen hardcoded mock veri (6 aylık testosterone/cortisol dizisi)
- `BloodworkDialog.tsx`: 3 tarih için hardcoded biyobelirteç verileri
- `blood_tests` tablosu zaten mevcut: `id`, `user_id`, `date`, `file_name`, `document_url`, `status`, `coach_notes`, `extracted_data` (jsonb)
- RLS: Coach `is_coach_of(user_id)` ile erişebiliyor — hazır

### Plan

**1. `BloodworkPanel.tsx` — Gerçek veriye bağla**
- `athleteId` prop'u ekle (AthleteDetail'dan geçirilecek)
- `blood_tests` tablosundan `user_id = athleteId` ile fetch et, `date desc` sırala
- Mock veriyi tamamen sil
- Her testin `extracted_data` jsonb'sinden biyobelirteçleri çıkar
- Son 2 testteki Testosteron/Kortizol değerlerini karşılaştırarak trend hesapla
- Veri yoksa: "Henüz kan tahlili yüklenmemiş" empty state göster
- Chart: Gerçek testlerden aylık testosterone/cortisol verisi oluştur

**2. `BloodworkDialog.tsx` — Gerçek veriye bağla**
- `athleteId` prop'u ekle
- Aynı `blood_tests` verisini al
- Her test tarihini tab olarak göster
- `extracted_data` içindeki biyobelirteçleri listele
- Veri yoksa empty state
- PDF indirme: gerçek `document_url`'e yönlendir

**3. `AthleteDetail.tsx` — athleteId prop'u geçir**
- `<BloodworkPanel athleteId={athlete.id} />` olarak güncelle

### Dosya Değişiklikleri
- `src/components/athlete-detail/BloodworkPanel.tsx` — tam yeniden yazım
- `src/components/athlete-detail/BloodworkDialog.tsx` — tam yeniden yazım  
- `src/pages/AthleteDetail.tsx` — tek satır prop ekleme


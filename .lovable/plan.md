
Hedef: “Program Atama Geçmişi” dialogundaki scroll problemini kalıcı olarak çözmek ve büyük veri çekiminden kaynaklı UI kilitlenmesini önlemek.

1) Kök nedenleri netleştirme (kod bulguları)
- `ProgramTab` içinde geçmiş açılırken loglar limitsiz çekiliyor (`program_assignment_logs`).
- Bir log genişletilince `assigned_workouts` tüm dönem için + tüm `exercises` JSON ile çekiliyor (aylarca veri tek seferde).
- Geçmiş detay sorgusu `program_id` bazlı olduğu için aynı programa ait eski-yeni tüm atamalar karışıp gereksiz büyüyor.
- Scroll container iyileştirilmiş olsa da (flex/min-h), büyük render anında ana problem “layout değil, veri + render yükü” olarak devam ediyor.

2) Uygulama planı (önce hızlı stabilizasyon, sonra kalıcı güçlendirme)
A. Hızlı stabilizasyon (UI donmasını hemen keser)
- `openHistory` için sayfalama ekle:
  - ilk yük: 20 kayıt
  - “Daha fazla yükle” ile sonraki sayfa
  - state: `historyPage`, `historyHasMore`, `historyLoadingMore`
- Log genişletmede ağır payload’ı küçült:
  - ilk açılışta sadece gerekli alanlar (`id, workout_name, day_of_week, scheduled_date, status`)
  - `exercises` alanını ilk istekten çıkar
- Log detayını sayfalı yükle:
  - `expandedByLogId[logId]` yapısı ile her log için ayrı cache + pagination
  - 10-20 satır/page
- Eşzamanlı tıklamalarda yarış durumunu engelle:
  - `currentExpandRequestRef` veya request token ile stale response’ları yok say.

B. Program önizleme sorgusunu hafifletme (yan etkili kilitlenmeleri engeller)
- `fetchWorkoutsForProgram`’da aylık/tüm dönem çekmek yerine:
  - ilk aşamada sadece 1 haftalık şablon için gerekli satırları (limitli) çek
  - gerekirse ikinci adımda sadece seçilen satırların detayını getir
- Amaç: ekranda zaten “1 haftalık önizleme” gösterildiği için veri çekimi de 1 haftalık kalmalı.

C. Scroll davranışını deterministik hale getirme
- `HistoryDialog` içinde `DialogContent` yüksekliğini sabitle: `h-[80vh]` (sadece `max-h` değil).
- `ScrollArea`yı `h-full min-h-0` ile bu sabit container içinde çalıştır.
- Header/footer alanını sabit, liste alanını tek kaydırılabilir bölge yap.

3) Kalıcı mimari güçlendirme (doğru veri modellemesi)
- (Önerilen) Atama gruplamasını netlemek için `assignment_batch_id` ekleme:
  - `program_assignment_logs.assignment_batch_id`
  - `assigned_workouts.assignment_batch_id`
- Atama sırasında tek batch id üretip hem log hem workout satırlarına yaz.
- Geçmişte bir log açıldığında `batch_id` ile sadece o atamanın satırları çekilir (karışma + aşırı veri biter).
- Bu adım migration gerektirir; hızlı stabilizasyonla birlikte veya ikinci adımda uygulanır.

4) Performans/DB destek adımları
- Gerekli indeksleri doğrula, yoksa ekle:
  - `assigned_workouts (athlete_id, program_id, scheduled_date)`
  - `program_assignment_logs (athlete_id, created_at desc)`
- Büyük veri durumunda sorgu sürelerini düşürür, scroll açılışını hızlandırır.

5) Kabul kriterleri (done)
- 12 haftalık ve çoklu atama geçmişinde dialog açılışı takılmadan <1sn render.
- Scroll her zaman çalışır (mouse wheel + trackpad).
- Log genişletme sırasında UI donmaz; veri parça parça yüklenir.
- Ağ isteklerinde tek seferde dev JSON çekimi yok.
- Aynı programa ait eski/yeni atamalar karışmadan görüntülenir (batch çözümü uygulanırsa).

Teknik detay (özet akış)
```text
Program Geçmişi Aç
  -> fetchLogs(page=1, limit=20)
  -> ScrollArea render (sabit h)

Log Expand
  -> fetchLogWorkouts(logId, page=1, limit=10, lightweight columns)
  -> append cache[logId]
  -> "Daha fazla" ile page+1

Program Önizleme
  -> fetch only weekly template rows (bounded)
  -> render 1-week UI
```

## Sorun analizi

- `Messages`, `AppSidebar` ve `MobileNav` ayrı ayrı `useCoachChat()` çağırıyor; bu yüzden her biri kendi bağımsız unread state’ini tutuyor.
- Mesaj sayfasında mesaj okundu yapıldığında sadece o hook instance’ı güncelleniyor; menüdeki hook instance’ı aynı state’i paylaşmadığı için sayı düşmeyebiliyor.
- Yeni mesaj gelince de menü instance’ı sadece kendi realtime event’ini yakalarsa artıyor; instance ayrılığı yüzünden durum tutarsız kalıyor.
- `messages` tablosu realtime yayında, ancak `REPLICA IDENTITY FULL` değil. Bu yüzden UPDATE event’lerinde eski satır verisi güvenilir gelmiyor; `is_read: false -> true` geçişini kesin yakalamak zorlaşıyor.
- `team_messages` tarafında da sadece INSERT dinleniyor; UPDATE/read event’i dinlenmediği için ekip içi mesaj badge’i de sayfa yenilemeden düşmeyebilir.

## Uygulama planı

1. `messages` ve `team_messages` tabloları için realtime UPDATE eski satır bilgisini güvenilir almak üzere migration ekleyeceğim:
   - `ALTER TABLE public.messages REPLICA IDENTITY FULL`
   - `ALTER TABLE public.team_messages REPLICA IDENTITY FULL`

2. `useCoachChat` içinde unread state güncellemesini sağlamlaştıracağım:
   - Yeni mesaj geldiğinde, eğer mesaj aktif konuşmadaysa otomatik okundu yapılacak ve badge artırılmayacak.
   - Aktif konuşma dışında geldiyse ilgili sporcu unread sayısı ve toplam badge atomik artacak.
   - Mesaj `is_read=true` olduğunda, önceki değer `false` ise ilgili sporcu unread sayısı ve toplam badge atomik düşecek.
   - `fetchMessages` içindeki stale `athletes` closure kullanımını kaldırıp fonksiyonel state updater ile doğru toplamdan düşeceğim.

3. `useTeamChat` için aynı realtime read mantığını ekleyeceğim:
   - `team_messages` UPDATE event’i dinlenecek.
   - Başka instance/tab/sayfa mesajı okundu yaptığında ekip içi unread count ve toplam badge anlık düşecek.
   - Realtime cleanup `removeChannel` ile mevcut proje kuralına uygun hale getirilecek.

4. Menü badge state’ini daha tutarlı yapmak için shared-hook yaklaşımı kuracağım:
   - `useCoachChat` ve `useTeamChat` state’leri tek provider/context üzerinden paylaşılacak.
   - `Messages`, `AppSidebar`, `MobileNav` aynı unread kaynağını okuyacak.
   - Böylece mesaj sayfasında okuma veya realtime yeni mesaj olayı menü badge’ine aynı render döngüsünde yansıyacak.

5. Doğrulama:
   - Realtime publication ve replica identity ayarlarını DB’den kontrol edeceğim.
   - İlgili kodda duplicate subscription/cleanup sızıntısı olmadığını kontrol edeceğim.
   - Mesaj geldiğinde artma, konuşmaya girince düşme, aktif konuşmadayken badge artmama senaryolarını hedefli doğrulayacağım.
## Hedef
Mesaj bildirimi badge’i, sayfa yenilemeden ve sohbete girmeden anlık görünsün; konuşmaya girilince veya mesaj okundu yapılınca anlık düşsün. Davranış Instagram gibi tek kaynaklı, tutarlı ve duplicate üretmeyen şekilde kurulacak.

## Uygulama planı

1. **Realtime DB kapsamını garantiye al**
   - `messages` tablosunun Supabase Realtime publication içinde olduğundan emin olacak idempotent migration eklenecek.
   - `messages` için `REPLICA IDENTITY FULL` korunacak; böylece okundu değişimlerinde eski/yeni değer güvenilir alınacak.
   - Gerekirse `chat_rooms` da publication’a idempotent eklenecek; direct mesaj/request listesi de refresh beklemeden güncellensin.

2. **`useCoachChat` için tek sağlam realtime reducer kur**
   - Gelen `INSERT` event’lerinde mesaj ID’si daha önce state’te varsa tekrar eklenmeyecek.
   - Optimistic mesaj ile gerçek DB mesajı eşleşirse geçici mesaj gerçek mesajla değiştirilecek.
   - Aktif sohbet dışından gelen inbound mesajda:
     - ilgili sporcunun `unreadCount` değeri +1,
     - global `totalUnread` +1,
     - son mesaj preview’i ve liste sırası anlık güncellenecek.
   - Aktif sohbet içinden gelen inbound mesajda:
     - mesaj ekranda görünecek,
     - otomatik `is_read=true` yapılacak,
     - badge artırılmayacak.

3. **Okundu düşüşünü event bazlı değil, state güvenli hale getir**
   - `UPDATE is_read=true` geldiğinde aynı mesaj için sadece bir kez decrement yapılacak.
   - Toplam badge negatif veya stale kalmayacak; unread toplamı sporcu listesinden yeniden türetilebilecek güvenli bir fonksiyonla senkron tutulacak.
   - `fetchMessages/selectAthlete` sırasında okundu yapılan tüm mesajlar UI’da hemen sıfırlanacak ve realtime UPDATE tekrar gelirse ikinci kez düşmeyecek.

4. **Bilinmeyen gönderen / direct mesaj senaryosunu düzelt**
   - Roster’da olmayan ama mesaj atan kullanıcı geldiğinde sadece `fetchAthletes()` beklenmeyecek; event geldiği anda mümkünse lightweight profil fetch ile listeye eklenecek.
   - Böylece ilk direct mesaj da refresh olmadan badge ve inbox satırı olarak görünür.

5. **`ActiveChat` duplicate key uyarısını temizle**
   - Mesaj render listesi ID bazında dedupe edilecek.
   - Optimistic/DB echo çakışmaları tek bubble olarak gösterilecek.
   - Console’daki `Encountered two children with the same key` uyarısı ortadan kaldırılacak.

6. **Mobil ve sidebar badge kaynaklarını aynı tut**
   - `AppSidebar`, `MobileNav`, `Messages` aynı `CoachChatProvider` state’inden okumaya devam edecek.
   - Badge hesabı ayrı ayrı manuel hesaplanmayacak; tek `totalUnread` kaynağı ile tutarlı hale getirilecek.

7. **Doğrulama**
   - Realtime publication ayarı DB’den kontrol edilecek.
   - Yeni mesaj geldiğinde refresh olmadan sidebar/mobile/messages tab badge artışı test edilecek.
   - Sohbete girince badge düşüşü ve aktif sohbet açıkken badge’in artmaması test edilecek.
   - Console duplicate key uyarısı yeniden kontrol edilecek.
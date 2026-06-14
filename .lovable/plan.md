## Sorun

`CoachChatProvider` global (MainLayout) seviyesinde yaşıyor ve `selectedAthleteId` state'i route değiştiğinde temizlenmiyor. Bir sporcuyla yazıştıktan sonra başka menüye geçtiğinde:

- `selectedAthleteIdRef.current` hâlâ o sporcunun id'sini tutuyor
- Realtime `INSERT` handler "bu mesaj aktif sohbetten geliyor" zannedip mesajı **otomatik okundu** işaretliyor (`is_read = true`)
- Sonuç: badge artmıyor, sanki sporcu sohbetindeymişsin gibi davranıyor

## Çözüm

Aktif sohbet kavramını sayfaya bağla: kullanıcı `/messages` rotasından çıktığında seçili sporcu sıfırlansın; geri döndüğünde manuel olarak bir sporcuya tıklamadan hiçbir thread "aktif" sayılmasın.

### Yapılacaklar

1. **`src/hooks/useCoachChat.ts`**
   - `clearSelection()` adında küçük bir fonksiyon ekle: `setSelectedAthleteId(null)` + `setMessages([])`. Context value'sunda dışarı aç.
   - Realtime `INSERT` handler'ında ekstra güvenlik: gönderen id seçili sporcu olsa bile, eğer geçerli `window.location.pathname` `/messages` ile başlamıyorsa "aktif sohbet" davranışına girme — mesajı unread say ve badge'i artır.

2. **`src/pages/Messages.tsx`** (veya `ActiveChat` mount eden sayfa)
   - `useEffect` ile component unmount olduğunda `clearSelection()` çağır.
   - Böylece kullanıcı başka menüye geçince seçili sporcu temizlenir.

3. **Doğrulama**
   - A sporcusuyla mesajlaş → başka menüye geç → A yeni mesaj atınca topbar/sidebar/mobil badge artmalı, sporcu listesinde unread sayacı görünmeli.
   - Geri `/messages`'a dönünce hiçbir sohbet açık olmamalı, kullanıcı manuel seçmeli.

Sadece frontend state/yaşam döngüsü değişikliği — DB veya realtime şeması etkilenmez.
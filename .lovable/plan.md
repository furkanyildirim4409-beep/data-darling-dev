# Mesaj Badge'i Anlık Güncelleme

## Sorun

`useCoachChat` hook'u iki ayrı yerde tüketiliyor:
- `AppSidebar` / `MobileNav` → menüdeki "Mesajlar" badge sayısı
- `Messages` sayfası → sohbet listesi ve aktif sohbet

Her tüketici hook'un kendi **bağımsız state instance**'ına sahip. Messages sayfasında bir sporcuya girildiğinde `fetchMessages` çalışıp DB'de `is_read = true` yapıyor ve **kendi** state'ini sıfırlıyor; ancak Sidebar instance'ı bu değişimi farketmediği için badge sayfa yenilenene kadar duruyor.

Realtime kanalında `UPDATE … receiver_id=eq.<coachId>` aboneliği var ama callback yalnızca `messages` dizisini ve `is_deleted` durumunu işliyor — `is_read` geçişlerini görmezden geliyor, bu yüzden Sidebar instance tetiklenmiyor.

## Çözüm

`src/hooks/useCoachChat.ts` içindeki receiver UPDATE handler'ını genişlet:

- Payload'da `is_read` `false → true` geçişi (önceki kayıt biliniyorsa `payload.old.is_read === false && payload.new.is_read === true`, bilinmiyorsa `new.is_read === true` ve ilgili sporcunun `unreadCount > 0`) tespit edildiğinde:
  - İlgili sporcunun `athletes[].unreadCount`'unu uygun miktarda azalt (tek mesaj için −1; toplu okuma durumunda mevcut sayıyı 0'a indir — aşağıya bak).
  - `totalUnread`'ı aynı miktarda düşür, 0'ın altına inmesin.
- Toplu okuma (bir sporcu açıldığında tüm okunmamışların aynı anda update edilmesi) Postgres realtime'da satır satır geldiği için her satır −1 düşürmek doğru sonucu verir; ekstra koruma olarak `unreadCount` 0'dan küçük olamaz.

Bu değişiklik yalnızca dinleyici eklemesidir; mevcut INSERT, gönderim ve `fetchMessages` davranışı dokunulmaz kalır. Diğer instance (Messages sayfası) zaten kendi state'ini güncellediği için tekrar tetiklenmesi sorun çıkarmaz (clamp sayesinde).

## Teknik Detay

Dosya: `src/hooks/useCoachChat.ts`
- Mevcut `event: 'UPDATE', filter: receiver_id=eq.${coachId}` handler'ında (≈ satır 485–508):
  - `payload.old` mevcut ve `old.is_read === false && new.is_read === true` ise: `senderId = new.sender_id` için athlete state'ini ve `totalUnread`'ı `-1` clamp(0) ile güncelle.
  - `payload.old` yoksa fallback: `new.is_read === true` iken athlete `unreadCount > 0` ise yine `-1` uygula (idempotent clamp güvenli).
- Sidebar/MobileNav/Messages tarafında kod değişikliği yok.

## Doğrulama

- Bir sporcudan okunmamış mesaj geldikten sonra menüdeki rozet artıyor.
- Mesajlar sekmesinden o sporcuya girilince badge **sayfa yenilemeden** anında düşüyor.
- Birden fazla okunmamış mesaj varsa hepsinin okunmasıyla birlikte rozet sıfırlanıyor.

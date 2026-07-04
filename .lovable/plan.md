## Kök Neden

Yaptığım analiz üç yerde eşzamanlı bir kırılma olduğunu gösteriyor:

**1. DB Trigger (`populate_order_coach_id`)** — Sepet item JSON'unda ürün sahibi `coachId` (camelCase) alanında geliyor, ancak trigger `item->>'coach_id'` (snake_case) arıyor. Bulamayınca son fallback devreye giriyor: **satın alanın `profiles.coach_id`'i**, yani sistemdeki tüm sporcular Super Admin'e bağlı olduğu için tüm shopify siparişleri Super Admin'e yazılıyor. Örnek: `65272568-e7b6-4b76-8b90-842faeadf662` numaralı sipariş `coachId: null` gelmiş, buyer'ın koçu Super Admin (`c21a5a19…`) olduğu için order.coach_id de o olmuş.

**2. RLS** — `orders` tablosunda hâlâ eski, çakışık SELECT/INSERT/UPDATE politikaları duruyor: "Coaches can view/insert/update orders for their athletes" (`is_coach_of(user_id)`). Bu politika Super Admin'e (ve alt-koçlarla eşleşen herkese) sattıkları ürün olmasa bile satın alanın koçu olduğu için tüm siparişleri gösteriyor.

**3. Frontend (`useStoreOrders`)** — Sorguda `coach_id` filtresi yok, tüm `orders`'ı çekiyor. RLS sızıntısı ile birleşince Super Admin panelinde her şey gözüküyor.

Ek: `shopify-webhook/handleOrder` fonksiyonu Shopify siparişini sadece UPDATE ediyor, insert etmiyor — insert öğrenci uygulaması tarafında olduğu için düzeltmeleri DB trigger + RLS düzeyinde yapmak tüm kanalları kapsayacak.

---

## Plan

### Adım 1 — `populate_order_coach_id` trigger'ını doğru şekilde yeniden yaz (migration)

- Item JSON'unu okurken hem `coach_id` hem `coachId` alanını kabul et.
- `coachId` yoksa `items[].shopifyVariantId` veya `items[].shopifyProductId`'yi `coach_products` tablosuyla eşleştir; ürün sahibinin `coach_id`'ini kullan.
- Sadece `order_type = 'coaching'` iken `profiles.coach_id` fallback'ine izin ver. `shopify`/`digital` siparişleri için fallback yok — item eşleşmezse `coach_id NULL` bırakılır ve sipariş yanlış panele düşemez.
- `NEW.coach_id` zaten set edilmişse dokunma (mevcut davranış korunur).

### Adım 2 — Mevcut yanlış yönlendirilmiş siparişleri backfill et (data update)

Tüm `order_type IN ('shopify','digital')` siparişleri için:
- Önce `items[].coachId` değerini dene.
- Yoksa `items[].shopifyVariantId` / `shopifyProductId` → `coach_products` join'ü ile bul.
- Bulunanları güncelle. Eşleşmeyenleri `coach_id = NULL` yapıp raporla.
- `coaching` siparişleri dokunulmaz.

### Adım 3 — `orders` RLS'ini temizle (migration)

Şu politikaları **DROP et** (satın alanın koçuna sızıntı yapıyorlar):
- `Coaches can view athlete orders` (SELECT `is_coach_of(user_id)`)
- `Coaches view athlete orders` (SELECT profiles.coach_id = auth.uid())
- `Coaches can insert orders for their athletes` (INSERT `is_coach_of(user_id)`)
- `Coaches can update orders for their athletes` (UPDATE `is_coach_of(user_id)`)

Duplicate/eş anlamlı politikaları da temizle:
- `Users can view own orders` ve `Users view own orders` çakışıyor — birini bırak.
- `Users can create their own orders` ve `Users can insert own orders` çakışıyor — birini bırak.

Kalması gereken çekirdek set:
- SELECT: `Coaches view their store orders` — `coach_id = auth.uid() OR is_active_team_member_of(coach_id)`
- SELECT: `Users can view own orders` — `user_id = auth.uid()`
- INSERT: `Users can insert own orders` — `user_id = auth.uid()`
- UPDATE (kargo/status): mevcut `enforce_coach_order_update_whitelist` trigger'ı zaten koçun yetkisini finansal alanlar dışında sınırlıyor; UPDATE için `Coaches view their store orders` mantığında bir UPDATE policy'si ekle: `USING (coach_id = auth.uid() OR is_active_team_member_of(coach_id))`.

### Adım 4 — Frontend query'sini sertleştir (`src/hooks/useStoreOrders.ts`)

- Şu an: filtresiz `.from('orders').select('*')`.
- Yeni: aktif koç bağlamını (baş koç + alt-koç: `activeCoachId` context) alıp `.or('coach_id.eq.<activeCoachId>,coach_id.eq.<user.id>')` filtresi ekle.
- RLS artık safety net olacak; UI de gereksiz veri çekmesin.

### Adım 5 — `handle-universal-orders` ve `shopify-webhook` uyum kontrolü

- İki edge function da `owner_id = order.user_id` mantığını mail loglamada kullanıyor. Sipariş sahibi coach değişkeni olarak `order.coach_id` kullanılan hiçbir yerde yanlış davranış yok; bu adımda sadece `coach_id`'nin dolu olduğu varsayımıyla mail routing'ini doğrula, kod değişikliği gerekirse yap.

### Adım 6 — Doğrulama

- Farklı iki koça (Super Admin dışı) ait test ürünleri sat, `orders.coach_id` doğru koça yazılmış mı doğrula.
- Süper admin hesabıyla `/store` aç → sadece kendi ürünlerine ait siparişleri görmeli.
- Diğer koç hesabıyla `/store` aç → sadece kendi satışları düşmeli.
- Alt-koç (team member) hesabıyla açıldığında baş koçun siparişlerini gördüğünü, başka koçların siparişlerini göremediğini doğrula.

---

## Etki

- **Migration 1**: `populate_order_coach_id` fonksiyonu yeniden tanımlanır.
- **Data update**: geçmiş shopify/digital siparişlerin `coach_id`'i doğru koça taşınır.
- **Migration 2**: `orders` RLS politikaları temizlenip yeniden yazılır.
- **Kod**: `src/hooks/useStoreOrders.ts` güncellenir.
- **Risk**: RLS temizliği sırasında athlete-scoped legacy politikalarına bağlı bir yer kalırsa siparişler görünmeyebilir; taramada `is_coach_of(user_id)` bağımlılığı olan başka yer görünmedi.

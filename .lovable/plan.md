## Tespit edilen sorunlar

DB sorgularıyla doğruladım (aktif koç `c21a5a19...`):

| Kanal | Gerçek tutar | Neden bozuk görünüyor |
|---|---|---|
| **Koçluk Paketleri** | **0 ₺** | `payments` tablosunda hiç satır yok. 3 adet `orders.order_type='coaching' status='paid'` kaydı var **ama hepsinin `coach_id`'si `NULL` ve sporcunun `profiles.coach_id`'si de `NULL`** — orphan kayıtlar olduğu için RPC bunları koça bağlayamıyor → segment 0 ₺ çıkıyor |
| **Diğer Ödemeler** | 310 ₺ | RPC doğru hesaplıyor, dilim çiziliyor ama Shopify (~7.063 ₺) yanında çok küçük kalıyor; aslında legend'de görünüyor |

Yani "Diğer Ödemeler grafiği yok" şikayetinin asıl sebebi orantı (310 / 7373 ≈ %4) ve **koçluk paketleri sıfır** olduğu için listenin görsel olarak bozulması.

## Çözüm

### 1. Orphan koçluk siparişlerini koça bağla (veri tamiri)

`orders` tablosundaki `coach_id IS NULL` olan `order_type='coaching'` kayıtlar için, `items` JSONB içindeki `coach_id` ya da sporcunun profilinde sonradan oluşmuş `coach_id` ile **backfill** yapılır. Aynı şekilde sporcunun `profiles.coach_id`'si hâlâ NULL ise, ödenmiş koçluk siparişinden gelen koç ile doldurulur (`handle_coaching_order_paid` triggeri sadece status transition anında çalıştığı için geçmiş kayıtları kaçırmış).

### 2. RPC'yi savunmacı hâle getir

`get_coach_business_metrics` koçluk geliri toplarken, `o.coach_id` ve `p.coach_id` yanına bir de **`items` JSONB içindeki `coach_id`** eşleşmesini ekler — böylece backfill dışında kalan veya gelecekte unutulan kayıtlar da dilime düşer.

### 3. Frontend dilim okunabilirliği

`RevenueSplitCard`:
- Pie'da çok küçük dilimler için `minAngle={4}` ekle → 310 ₺ gibi küçük değer de görsel olarak farkedilebilir bir dilim çizer.
- Sağ taraftaki legend listesi zaten her 3 kanalı tutar; "0 ₺" satırı opak (`opacity-60`) gösterilerek "veri yok" olduğu daha açık iletilir.
- Boş açıklama metni güncellenir: "Koçluk paketleri, e-ticaret ve diğer ödemeler".

## Teknik detaylar

- Backfill iki adımlı SQL (data update, migration değil): önce `orders.coach_id := items->coach_id`, sonra `profiles.coach_id := COALESCE(profiles.coach_id, items->coach_id)` ödenmiş koçluk siparişleri için.
- RPC değişikliği: `coaching_orders_revenue` sorgusuna `OR EXISTS (SELECT 1 FROM jsonb_array_elements(o.items) it WHERE NULLIF(it->>'coach_id','')::uuid = coach_uuid)` eklenir.
- Frontend: `Pie` propuna `minAngle={4}`; legend itemine `data.value === 0 && "opacity-60"` class.
- Aktif sporcular sayısı RPC mantığı korunur, sadece toplama değişir.

## Beklenen sonuç

Koç `c21a5a19` için:
- Koçluk Paketleri: 0 → **300 ₺** (3 orphan order backfill sonrası, sporcu profilleri de koça bağlanır)
- E-Ticaret: 7.063,70 ₺ (değişmez)
- Diğer Ödemeler: **310 ₺** (zaten doğru, artık daha okunabilir dilimle)
- Toplam: 7.673,70 ₺

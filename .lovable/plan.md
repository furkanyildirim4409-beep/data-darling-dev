## Analiz özeti

DB ve kod hattını birlikte inceledim:

- `profiles` içinde şu an `subscription_status = 'terminated'` olan kullanıcı var: `MEHMET TUNÇ`.
- Bu kullanıcının `coach_id` alanı `NULL` olmuş.
- Aynı kullanıcının son ücretli koçluk siparişindeki `items[].coach_id` değeri hâlâ doğru koça bağlı: `c21a5a19-daaf-4e23-90f6-71179e7f8bcd`.
- `StoreManager.tsx` içindeki feshedilenler listesi şu filtreyle çalışıyor:
  - `subscription_status = 'terminated'`
  - `coach_id = activeCoachId`
- Fesih aksiyonu `AthleteDetail.tsx` içinde kullanıcıyı feshederken `coach_id: null` yapıyor. Bu nedenle ikinci fesihten sonra kayıt DB'de durmasına rağmen liste sorgusundan eleniyor.
- Son Postgres loglarında bu akışa dair RLS/policy/permission hatası görünmedi; sorun cache değil, query filtresinin `coach_id` silindikten sonra geçmiş sahipliği kaybetmesi.

## Kök neden

Fesih geçmişi `profiles.coach_id` alanına bağlı okunuyor; ancak fesih işlemi aynı alanı `NULL` yaptığı için geçmiş liste kendi kanıtını siliyor. İkinci satın alma/aktifleşme/fesih döngüsünde kayıt `terminated` kalıyor ama `coach_id` boş olduğu için `Feshedilen Sporcular` sheet'inde görünmüyor.

## Uygulama planı

1. **`StoreManager.tsx` terminated query hattını düzelt**
   - `TerminatedAthletesPanel` sorgusunu sadece `profiles.coach_id = activeCoachId` filtresine bağlı bırakmayacağım.
   - Önce aktif koça ait `paid + coaching` siparişlerden athlete id’lerini çıkaracağım.
   - Sonra `profiles` tablosundan `subscription_status = 'terminated'` ve `id IN (bu athlete id’leri)` olacak şekilde okuyacağım.
   - Böylece `coach_id` fesihte `NULL` olsa bile geçmiş satın alma bağından doğru koç listesinde görünecek.

2. **Tip güvenliğini artır**
   - `TerminatedRow` tipine gerekirse paket/sipariş kaynaklı alanları ekleyeceğim.
   - JSON `items` alanını güvenli parse edeceğim; kırık/boş item listeleri UI’ı bozmayacak.

3. **Fesih kaldırma sonrası invalidation’ı mevcut düzenle uyumlu tut**
   - `terminated-athletes`, `athletes`, `athlete` query invalidation zincirini koruyacağım.
   - Gerekli yerde `refetch()` ile sheet’in anında senkron kalmasını sağlayacağım.

4. **DB değişikliği yapmayacağım**
   - Mevcut schema ile çözülebiliyor.
   - RLS hatası/log hatası olmadığı için migration gerekmez.

## Beklenen sonuç

- Feshedilmiş kullanıcı DB’de `coach_id = NULL` olsa bile, son/önceki ücretli koçluk siparişindeki `coach_id` üzerinden doğru koçun `Feshedilen Sporcular` listesinde görünür.
- Tekrar aktifleşme, tekrar satın alma ve tekrar fesih döngüsünde browser refresh gerekmeyecek.
- Mevcut RLS modeline ek risk getirilmeden sadece frontend query hidrasyonu düzeltilmiş olacak.
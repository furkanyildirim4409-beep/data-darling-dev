## Amaç
1. Mevcut ürünleri **düzenleyebilme** (başlık, açıklama, fiyat, kategori, stok adedi, görsel) — Shopify ile gerçek zamanlı senkron.
2. Stoğu 0'a düşmüş (`stock_quantity === 0` veya pasifleştirilmiş) fiziksel ürünlerde kart üzerinde **"Tükendi"** rozeti göster.

OAuth, scope, `useCreateProduct`, `useUpdateProductStatus`, dijital ürün davranışı **dokunulmadan** korunur.

---

## 1) Yeni Edge Function — `supabase/functions/update-shopify-product/index.ts`

Mevcut `create-shopify-product` ile aynı auth/role/CORS yapısını kullanır.

**Body schema (Zod):**
- `productId` (DB id, uuid) — zorunlu
- `title?`, `descriptionHtml?`, `price?`, `category?`, `stockQuantity?`, `imageUrl?` (yeni görsel yüklendiyse)
- En az bir alan değişmiş olmalı

**Akış:**
1. DB'den `coach_products` satırını çek (`coach_id === userId` olmalı, aksi 403). `shopify_product_id`, `shopify_variant_id`, `product_type`, mevcut `image_url` alınır.
2. Shopify mutations (gerektiğinde):
   - `productUpdate` — title/descriptionHtml/productType/tags güncelle.
   - `productVariantsBulkUpdate` — fiyat değiştiyse.
   - `inventorySetQuantities` — stok değiştiyse (sadece fiziksel; LOCATIONS_QUERY ile primary location, mevcut akıştaki gibi).
   - `productCreateMedia` — yeni görsel yüklendiyse (eski medya silmeye gerek yok; best-effort).
3. Hata haritası `mapShopifyError` (mevcut dosyadan kopya pattern).
4. Başarı: DB satırını güncelle (`title`, `description`, `price`, `category`, `stock_quantity`, `image_url`).

**Güvenlik:** `coach` veya `admin` rolü zorunlu, satır sahipliği doğrulanır.

---

## 2) Hook — `src/hooks/useStoreMutations.ts`

Yeni mutation:
```ts
useUpdateProduct(): {
  mutateAsync({
    id, title?, description?, price?, category?,
    stockQuantity?, imageFile?: File | null
  })
}
```
- Yeni `imageFile` varsa `products` bucket'a upload, public URL al, eski path opsiyonel olarak silinir.
- `update-shopify-product` edge function çağrılır.
- Başarıda `coach-products` query invalidate.
- Hata mesajları mevcut `useCreateProduct` ile aynı pattern (ACCESS_DENIED/UNAUTHORIZED parse).

---

## 3) UI — `src/pages/StoreManager.tsx`

### a) Düzenle akışı
- Her ürün kartına **kalem ikonu** (Edit2) buton: tıklayınca **Dialog** açar (mevcut `@/components/ui/dialog`).
- Dialog içerik: oluşturma formuyla aynı alanlar (görsel önizleme + opsiyonel yeni görsel yükleme, başlık, açıklama, fiyat, kategori, fiziksel ise stok adedi). Ürün tipi ve Shopify taksonomi alanları **read-only** gösterilir (kategoriyi değiştirmek farklı bir Shopify operasyonu; bu plana dahil değil).
- "Kaydet" → `useUpdateProduct` çağırır → toast → dialog kapanır.

### b) "Tükendi" rozeti
- Ürün kartında, `product_type === "physical"` ve `stock_quantity === 0` ise kart sağ üst köşesine **kırmızı `Badge` "Tükendi"** (absolute pozisyon, görsel üzerine).
- Stok satırındaki `{stock_quantity} adet` metni 0 ise `text-destructive` ile renklendir.
- Dijital ürünlerde rozet gösterilmez (∞).

---

## 4) Veritabanı
Şema değişikliği yok. Mevcut kolonlar (`title`, `description`, `price`, `category`, `stock_quantity`, `image_url`) güncellenir.

---

## 5) Scope/Secrets
Mevcut `write_products` + `write_inventory` yeterli. Yeni secret yok.

---

## Teknik Notlar
- `productUpdate` mutation Shopify Admin GraphQL `2025-01`+ ile uyumlu (mevcut `_shared/shopify-admin.ts` kullanılır).
- Stok 0'a düşürmek "Tükendi" rozetini otomatik aktive eder; ayrıca pasifleştirme (is_active=false) durumunu **etkilemez** (zaten "Pasif" yazısı var).
- Görsel değişikliği best-effort: `productCreateMedia` ile yeni görsel eklenir; eski medyanın Shopify tarafında silinmesi bu plana dahil değil (istenirse genişletilir).

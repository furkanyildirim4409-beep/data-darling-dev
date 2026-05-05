## Amaç
Mevcut OAuth/token akışı, UI yapısı ve diğer özellikler değiştirilmeden:
1. Shopify'da ürünün gerçekten **kategorize** edilmesi (resmi taksonomi ile).
2. **Fiziksel** ürünlerde "Sınırsız Stok" seçeneğinin kaldırılması — stok adedi zorunlu olmalı.
3. **Dijital** ürünlerde davranış aynı kalır (kargo yok, stok takibi yok).

---

## 1) Edge Function — `supabase/functions/create-shopify-product/index.ts`

Sadece `productCreate` mutation'ına gerçek Shopify kategori atama alanı eklenecek. Token, scope, diğer adımlar (variant update, inventory, publish, media) **aynen korunur**.

### Değişiklikler

- `BodySchema`'ya opsiyonel `categoryId` (Shopify Taxonomy GID, ör: `gid://shopify/TaxonomyCategory/sg-4-17-2-17`) alanı eklenecek. Geriye dönük uyumluluk için zorunlu değil.
- Validasyon: `productType === "physical"` ise `stockQuantity` zorunlu (≥ 0) ve `trackInventory` otomatik `true` kabul edilir. Eksikse 400 döner.
- `PRODUCT_CREATE` `ProductInput`'a:
  - `category: $categoryId` (varsa) — bu Shopify'ın resmi taksonomi atamasıdır; "Products" panelinde "Category" alanını doldurur ve Markets/SEO/tax için kullanılır.
  - `productType` alanı (serbest metin) korunur ama artık `category` (free-text label) yerine kullanıcının seçtiği taksonomiyi yansıtacak.
- Tag'ler korunur (`type:physical|digital`, `category:<label>`).

### Yeni hata yönetimi

- `category` ID Shopify tarafında geçersizse `productCreate` userErrors döner — mevcut error handler bunu zaten 400 olarak yansıtıyor; ek değişiklik yok.

---

## 2) Frontend — `src/pages/StoreManager.tsx`

### a) "Sınırsız Stok" kaldırma (sadece fiziksel)
- `unlimitedStock` state ve Switch UI'ı **kaldırılır**.
- Fiziksel ürün seçildiğinde Stok Adedi input'u her zaman görünür ve **zorunlu** olur (boş submit edilemez).
- Form geçerlilik (`canSubmit`) kuralı: fiziksel ise `stockQty !== "" && Number(stockQty) >= 0`.
- Dijital için stok bloğu hiç render edilmez (mevcut davranış).

### b) Gerçek Shopify kategori seçimi
- Mevcut serbest metin "Kategori" input'u korunur ama yanına **Shopify Kategorisi** seçici eklenir (Combobox/Command):
  - Yaygın fitness/coach kategorilerinden hazır kısa liste (label + `categoryId` GID), ör:
    - Sporting Goods > Exercise & Fitness > Exercise Equipment
    - Sporting Goods > Exercise & Fitness > Yoga & Pilates
    - Health & Beauty > Health Care > Fitness & Nutrition > Nutritional Supplements
    - Apparel & Accessories > Clothing > Activewear
    - Media > Books / Digital Goods (dijital seçildiğinde önerilir)
  - "Kategori seçilmedi" opsiyonu da kalır (geriye dönük).
- Seçilen kategori `categoryId` payload'ına eklenir; serbest metin `category` etiket olarak kalır (UI badge için).

### c) Ürün kartı
- Stok rozetinin "∞" varyantı sadece **dijital** ürünlerde gösterilir; fiziksel ürünlerde her zaman sayısal gösterilir.

---

## 3) Hook — `src/hooks/useStoreMutations.ts`

- `CreateProductPayload` tipine `categoryId?: string` eklenir.
- Edge function çağrısında ve DB insert'inde forward edilir (DB tarafında ek kolon yok — sadece edge function'a gider; istenirse ileride `coach_products.shopify_category_id` eklenebilir, bu plana dahil değil).

---

## 4) Veritabanı
- Şema değişikliği **YOK**. (`stock_quantity` zaten var; artık fiziksel için NOT NULL davranışı uygulama katmanında zorlanır.)

---

## 5) OAuth / Secrets / Scopes
- Hiçbiri değişmiyor. Mevcut `write_products` scope `category` alanı için yeterlidir.

---

## Teknik Notlar
- Shopify Admin API `ProductInput.category` alanı `2024-04`+ sürümlerinde mevcut; mevcut `shopifyAdminGraphQL` helper'ı kullanılan API versiyonu uyumlu (kontrol edilecek; değilse `_shared/shopify-admin.ts` içindeki versiyon `2025-01`'e güncellenecek — sadece string).
- Hazır kategori listesi koddan yönetilir (statik sabit), runtime'da Shopify Taxonomy API çağrısı yapılmaz (basitlik için).

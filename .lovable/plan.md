# Shopify Ürün Yayını — Tip + Stok + Tüm Kanallar

OAuth (`client_credentials` token akışı, `_shared/shopify-admin.ts`) **tamamen aynı kalır**. Sadece ürün oluşturma sırasında gönderilen Admin GraphQL mutation'ları zenginleştirilir ve UI yeni alanlar kazanır.

## 1. Veritabanı (`coach_products` tablosuna 3 kolon)

```
product_type      text   default 'physical'   -- 'physical' | 'digital'
stock_quantity    int    nullable             -- null = sınırsız
track_inventory   bool   default true
```

Migrasyon ile eklenir; mevcut satırlar `physical` + `track=true` + `stock=null` olur.

## 2. UI — `src/pages/StoreManager.tsx`

Yeni Ürün formuna eklenecekler:

- **Ürün Tipi seçici** (segmented buttons): `Fiziksel` / `Dijital`
  - Dijital seçildiğinde kargo gerektirmez, stok alanı otomatik "Sınırsız"a düşer ve disable olur.
- **Stok alanı** (sadece Fiziksel'de görünür):
  - Sayı input + "Sınırsız" toggle. Sınırsız açıkken `stock_quantity = null`, `track_inventory = false`.
- Kart görünümünde her ürünün altında küçük rozet: `Fiziksel · 23 adet` veya `Dijital · ∞`.

State: `productType`, `stockQty`, `trackInventory`. `handleSubmit` bunları `createProduct` payload'ına ekler.

## 3. Hook — `src/hooks/useStoreMutations.ts`

`CreateProductPayload` arayüzü genişler:

```ts
productType: 'physical' | 'digital';
trackInventory: boolean;
stockQuantity: number | null;
```

Bu değerler hem edge function `body`'sine, hem de `coach_products` insert satırına yazılır.

## 4. Edge Function — `supabase/functions/create-shopify-product/index.ts`

Token alma akışına dokunulmaz. Sadece şunlar değişir:

### a) Zod şemasına yeni alanlar eklenir
`productType`, `trackInventory`, `stockQuantity` (nullable, non-negative int).

### b) `productCreate` mutation güncellenir
Variant alanlarını döndürmek için `inventoryItem { id }` ve `inventoryQuantity` eklenir. Input'a şunlar eklenir:
- `productType`
- `requiresSellingPlan: false`

### c) Default variant tipini ayarla (`productVariantsBulkUpdate`)
Variants payload'ı şöyle olur:

```jsonc
{
  id: variantId,
  price: "...",
  inventoryPolicy: "DENY",
  inventoryItem: {
    tracked: trackInventory,
    requiresShipping: productType === 'physical'
  }
}
```

### d) Stok seviyesini ayarla — yeni adım
Eğer `trackInventory && stockQuantity != null`:

1. `locations(first: 1)` ile primary location ID alınır.
2. `inventorySetQuantities` mutation:
   ```graphql
   mutation($input: InventorySetQuantitiesInput!) {
     inventorySetQuantities(input: $input) {
       userErrors { field message code }
     }
   }
   ```
   `name: "available"`, `reason: "correction"`, tek satır: `inventoryItemId` + `locationId` + `quantity`.

### e) Tüm satış kanallarına yayınla — yeni adım
Ürün oluşturulduktan sonra:

1. `publications(first: 25)` ile tüm yayın kanalları (Online Store, Point of Sale, Shop, vs.) listelenir.
2. `publishablePublish` mutation ile productId tüm publication ID'lere bağlanır:
   ```graphql
   mutation($id: ID!, $input: [PublicationInput!]!) {
     publishablePublish(id: $id, input: $input) {
       userErrors { field message }
     }
   }
   ```

### f) Görsel ekleme aşaması (`productCreateMedia`) aynı kalır.

Hata yönetimi: stock veya publication hatası 200 ile `warning` alanında döner — ürün oluşturma başarısız sayılmaz (tıpkı mevcut media hatası gibi).

### g) Gerekli scope'lar
Dev Dashboard → App Configuration'da bu scope'ların açık olması gerekir (token akışı değişmez, yalnızca scope listesi):
- `write_products` ✓ (mevcut)
- `write_inventory` (stok için)
- `write_publications` (kanal yayını için)

Eğer kapalıysa edge function 403 döner ve mevcut `mapShopifyError` Türkçe mesajı kullanıcıya gösterir.

## 5. Realtime davranış

`coach_products` insert/update zaten React Query invalidation ile UI'ye yansıyor; ek bir realtime channel gerekmez. Yeni alanlar otomatik refresh ile listeye düşer. Shopify tarafındaki stok değişiklikleri tek yönlüdür (Coach OS → Shopify); ters yön bu PR kapsamı dışında.

## Onayınız sonrası uygulama sırası
1. Migrasyon (3 kolon)
2. Edge function güncelle + deploy
3. Hook tip ve payload genişletme
4. UI tip seçici + stok alanı + kart rozetleri

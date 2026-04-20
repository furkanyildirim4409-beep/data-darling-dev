

## Fork'taki Shopify Admin Token Motorunu Port Et

### Bulgular

- Fork projesi (`Your Dynabolic Fork`), Shopify Admin token'ını **runtime'da** Dev Dashboard `client_credentials` grant ile kendisi üretiyor.
- Bu projede gerekli secret'ların **hepsi zaten mevcut**: `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_DOMAIN`. Yeni secret istenmeyecek.
- Mevcut `create-shopify-product` fonksiyonu hâlâ stale `SHOPIFY_ACCESS_TOKEN` / `SHOPIFY_ADMIN_TOKEN` deniyor — bu yüzden 401 + ACCESS_DENIED alıyoruz.
- Çözüm: fork'taki `_shared/shopify-admin.ts` motorunu birebir buraya kopyalamak ve `create-shopify-product` fonksiyonunu bu motoru kullanacak şekilde sadeleştirmek.

### Yapılacaklar

#### 1) Yeni dosya — `supabase/functions/_shared/shopify-admin.ts`
Fork'taki dosyanın birebir aynısı:
- `getShopifyAdminToken(forceRefresh?)` — `https://{SHOPIFY_DOMAIN}/admin/oauth/access_token` adresine `grant_type=client_credentials` POST atar, token'ı edge instance'ında cache'ler (expiry − 60s).
- `shopifyAdminGraphQL<T>(query, variables)` — Admin API `2025-07`'ye GraphQL çağrısı atar; 401'de bir kez force-refresh yapar; hata olursa structured `ShopifyAdminError` (status, requiredAccess, shopifyMessage) fırlatır.
- `invalidateShopifyAdminToken()` helper'ı.

#### 2) `supabase/functions/create-shopify-product/index.ts` — yeniden yaz
Mevcut "iki token deneme" akışı tamamen silinir, fork'taki temiz akış konur:
- JWT validation `getClaims()` ile (mevcut korunur).
- `has_role` ile coach/admin yetki kontrolü (mevcut korunur).
- Zod ile body validation.
- 3 adımlı pipeline `shopifyAdminGraphQL` üzerinden:
  1. `productCreate` (status ACTIVE, vendor, productType, tags `coach:{userId}`, `category:{category}`)
  2. `productVariantsBulkUpdate` — default variant'a fiyat
  3. `productCreateMedia` — görsel
- Media adımı fail olsa bile `success: true, productId, variantId, warning` ile 200 döner (best-effort).
- `mapShopifyError`:
  - `403 / "access denied"` → Dev Dashboard scope mesajı
  - `401` → `SHOPIFY_CLIENT_ID/SECRET` kontrolü mesajı
  - diğer → 502

#### 3) `src/hooks/useStoreMutations.ts` — küçük hata parser güncellemesi
Edge function artık structured `{ code: "ACCESS_DENIED", message, helpUrl }` döndüğü için parser sadeleştirilir:
- `ACCESS_DENIED` → "Shopify Dev Dashboard → App → Configuration → write_products scope'unu aktif edin."
- `UNAUTHORIZED` → "SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET kontrol edilmeli."
- Storage rollback davranışı korunur.

### Etkilenen Dosyalar

| Dosya | İşlem |
|------|------|
| `supabase/functions/_shared/shopify-admin.ts` | Yeni — fork motoru birebir |
| `supabase/functions/create-shopify-product/index.ts` | Yeniden yaz — shared motoru kullan |
| `src/hooks/useStoreMutations.ts` | Küçük — yeni structured error mesajları |

### Secret / Migration Durumu

- **Yeni secret yok.** `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_DOMAIN` zaten mevcut.
- **Migration yok.**
- Stale `SHOPIFY_ACCESS_TOKEN` / `SHOPIFY_ADMIN_TOKEN` artık `create-shopify-product` tarafından okunmayacak; storefront tarafı için silinmeden duracak.

### Beklenen Sonuç

Token artık staff hesabına bağlı olmadan, app'in kendi `write_products` scope'uyla mintleniyor. `ACCESS_DENIED` ortadan kalkar; eğer hâlâ scope eksikse hata net olarak Dev Dashboard'a yönlendirir.


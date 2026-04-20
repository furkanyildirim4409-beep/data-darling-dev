

## Coach Vendor Portal — Shopify Product Upload

Replace `StoreManager.tsx` with a clean two-section page: **Upload Form** on top, **My Products Grid** below. Push to shared Shopify via the existing edge function, persist mapping in `coach_products`.

### 1. Database migration

`coach_products` is missing the columns the spec needs. Add:

```sql
ALTER TABLE public.coach_products
  ADD COLUMN IF NOT EXISTS shopify_product_id text,
  ADD COLUMN IF NOT EXISTS shopify_variant_id text,
  ADD COLUMN IF NOT EXISTS category text;

CREATE INDEX IF NOT EXISTS idx_coach_products_coach_active
  ON public.coach_products(coach_id, is_active);
```

(All nullable so existing rows survive. RLS already in place — no policy change.)

### 2. Storage

Use existing public `products` bucket. Path convention: `${user.id}/${timestamp}-${filename}`. Add an RLS policy if not present so coaches can write only into their own folder:

```sql
CREATE POLICY "Coaches upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'products' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read products"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');
```

(Skipped if already present — migration uses `IF NOT EXISTS` pattern via `DO` block.)

### 3. Hook updates — `src/hooks/useStoreMutations.ts`

Extend `useCreateProduct` to:
1. Upload image file → `products/${user.id}/...` → public URL.
2. `supabase.functions.invoke("create-shopify-product", { body: { title, descriptionHtml: description, price, imageUrl, category, vendorName: profile.full_name } })`.
3. Read `productId` + `variantId` from response.
4. Insert into `coach_products` with `{ coach_id, title, description, price, image_url, category, shopify_product_id: productId, shopify_variant_id: variantId, is_active: true }`.
5. Toast success + invalidate `coach-products` query.
6. On any failure, rollback the storage upload (best-effort delete) and surface a toast.

`useUpdateProductStatus` stays as-is (already toggles `is_active`).

### 4. New page — `src/pages/StoreManager.tsx` (full rewrite)

**Layout:**

```text
┌─────────────────────────────────────────────────────┐
│ Mağaza Yönetimi                                      │
│ Ürünlerinizi Shopify ile senkronize ederek yayınlayın│
├─────────────────────────────────────────────────────┤
│ [ Glass card: Yeni Ürün Yükle ]                      │
│  ┌─Görsel─┐  Başlık ____________________________     │
│  │drop    │  Açıklama __________________________     │
│  │zone    │  Fiyat (₺) ___   Kategori [Select ▾]     │
│  └────────┘  [ Yayınla ve Shopify'a Gönder ]         │
├─────────────────────────────────────────────────────┤
│ Ürünlerim (12)                          [grid view]  │
│  ┌─img─┐  ┌─img─┐  ┌─img─┐  ┌─img─┐                 │
│  │     │  │     │  │     │  │     │                 │
│  │₺199 │  │₺349 │  │₺79  │  │₺1499│                 │
│  │[on] │  │[on] │  │[off]│  │[on] │                 │
│  └─────┘  └─────┘  └─────┘  └─────┘                 │
└─────────────────────────────────────────────────────┘
```

**Form fields:**
- Image dropzone (click + drag-drop, preview thumb, file size guard 5 MB).
- Title (required).
- Description textarea.
- Price (number, ₺).
- Category Select with options: `Takviye`, `Ekipman`, `Dijital İçerik`, `Giyim`.
- Submit button: shows `Loader2` spinner while `isCreating`, disabled if required fields empty.

**Grid (`MyProductsGrid` inline component):**
- Renders `useCoachProducts()` data.
- Glass card per product: image (aspect-square, rounded), title, price in primary, category badge, `Switch` bound to `is_active` calling `useUpdateProductStatus`.
- Empty state: glass panel with `Package` icon + "Henüz ürün eklemediniz" copy.
- Loading: 4 skeleton cards.

**Permission gate:** keep `canManageStore` check. If false, show the existing `ShieldAlert` empty state instead of the upload form. Grid still visible (read-only — switches disabled).

### 5. Cleanup
- Remove now-unused components from import: `ProductEditor`, `ProductList`, `ProductDetailDialog`, `MobilePreview`, `SalesChart`, `Tabs` for product type. (Files stay on disk — nothing else imports them — but leave them; no risk.)
- Sidebar entry `/store` already exists. No nav change.

### Files

| File | Action |
|------|--------|
| Migration SQL | CREATE — add 3 columns + index + storage policies |
| `src/hooks/useStoreMutations.ts` | EDIT — upload + invoke edge fn + insert mapping |
| `src/pages/StoreManager.tsx` | REWRITE — Upload Form + My Products Grid |

### Confirmation
- Image scoped to `products/${auth.uid()}/...` per spec.
- `create-shopify-product` invoked exactly with `{ title, descriptionHtml, price, imageUrl, category, vendorName }`.
- `coach_products` row stores both Shopify IDs + category for downstream marketplace sync.
- Glassmorphic dark theme via existing `glass`/`bg-card` tokens — matches Coach OS aesthetic.


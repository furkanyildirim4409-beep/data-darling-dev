# Product Studio Overhaul & Admin Approval Gateway — Plan

## Reality check first

A few important things diverge from your brief — calling them out so we don't waste a build cycle:

1. **`ProductEditor.tsx` and `ProductList.tsx` are orphaned** in the live store flow. The production "Yeni Ürün Yükle" form lives in `src/pages/StoreManager.tsx` (lines 105–536); the "Ürünlerim" grid is also in that file (lines 564–667). Only `MobilePreview.tsx` imports `ProductData` as a type from `ProductEditor.tsx`.
   → I'll do the real upgrade in `StoreManager.tsx` (and `useStoreMutations.ts` + the Shopify edge function). I'll keep `ProductEditor.tsx` aligned (same category list + digital-doc slot + new button label) so it stays consistent, but the gating workflow lives in the production path.

2. **`src/data/storyCategories.ts` is unrelated** — it's for Stories content, not products. The product `CATEGORIES` constant is at `StoreManager.tsx:72`. I'll change it there.

3. **No `coach_products.status` column today.** `digital_file_url` and `product_kind` exist (added in Part 1). I'll add `status` via migration.

4. **Shopify draft mode**: `create-shopify-product/index.ts:233` hardcodes `status: "ACTIVE"`. I'll thread a `publishAsDraft` flag through `useCreateProduct` → edge function so it sets `status: "DRAFT"` for products pending admin approval.

5. **`digital-products` storage bucket doesn't exist yet** — I'll create it as private with RLS.

## Database migration

1. `ALTER TABLE public.coach_products ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';`
   Allowed values: `pending_admin_approval`, `approved`, `rejected`. Existing rows backfill as `approved` (don't retroactively gate live inventory).
2. CHECK constraint enforcing those three values.
3. Index on `(coach_id, status)`.
4. Trigger: when a coach inserts/updates a product, if they're not admin, force `status='pending_admin_approval'` (defense in depth alongside the client setting it).
5. RPC `approve_product(product_id uuid, decision text)` callable only by admins (`has_role(auth.uid(), 'admin')`) that flips status to `approved` or `rejected` and also flips Shopify status back to ACTIVE via an edge call (or just sets `is_active`, leaving Shopify activation as a follow-up).
6. New private storage bucket **`digital-products`** + RLS: owner coach can `INSERT/SELECT/DELETE` their own files (`auth.uid()::text = (storage.foldername(name))[1]`); admins can read all; signed URLs for purchasers handled out of scope here.

## `src/pages/StoreManager.tsx` — production form upgrade

- **Replace `CATEGORIES`** with the new 6 specialized vectors:
  ```ts
  const CATEGORIES = [
    "Gıda Takviyeleri & Supplement",
    "Antrenman Ekipmanları",
    "Spor Giyim & Tekstil",
    "Dijital Program & E-Kitap",
    "Sağlıklı Atıştırmalıklar",
    "Ortopedik Destek Ürünleri",
  ] as const;
  const DIGITAL_CATEGORY = "Dijital Program & E-Kitap";
  ```
- **Auto-toggle `product_kind`**: a `useEffect` on `category` forces `productType = 'digital'` when category equals `DIGITAL_CATEGORY`, otherwise `'physical'`. The existing physical/digital segmented buttons stay but become read-only display when category is digital (or hide and replace with an info row).
- **Digital file dropzone**: when `productType === 'digital'`, render a new section "Dijital Ürün Belgesi Yükle" — drag-and-drop accepting `.pdf` and `.zip`, max 50MB, uploads to `supabase.storage.from('digital-products')`. Stores the resulting path on the product row's `digital_file_url`. Required before submit when digital.
- **Button overhaul**: replace the "Yayınla ve Shopify'a Gönder" CTA with **"Yayınla ve Onaya Gönder"** plus a small caption "Ürününüz admin onayından sonra mağazada görünecek".
- **Submit flow**: pass `publishAsDraft: true` + `status: 'pending_admin_approval'` + `digitalFileUrl` to `useCreateProduct`.
- **Product grid card** (lines 564–667): if `product.status === 'pending_admin_approval'`, render a glowing badge **"🟠 ONAY BEKLİYOR"** absolutely positioned above the thumbnail (top-2 left-2, amber gradient, soft glow shadow), and dim the card slightly. Hide the active/passive switch when pending (status overrides it). If `status === 'rejected'`, show a red "🚫 ONAYLANMADI" variant.
- **Edit dialog**: also enforce the new category list. Editing a previously approved product keeps it approved; editing a pending one stays pending.

## `src/hooks/useStoreMutations.ts`

- Extend `CreateProductPayload` with `publishAsDraft?: boolean` and `digitalFileUrl?: string | null`.
- Pass `publishAsDraft` to the edge function body.
- After Shopify create, insert into `coach_products` with `status: 'pending_admin_approval'` (when draft) and `digital_file_url` populated.
- Update `useUpdateProductStatus` query invalidations to also refresh after admin approval RPC.

## `supabase/functions/create-shopify-product/index.ts`

- Accept `publishAsDraft: z.boolean().optional()` in `BodySchema`.
- Set `productInput.status = publishAsDraft ? "DRAFT" : "ACTIVE"`.
- Optional tag `pending_admin_approval` when draft, so Shopify-side filters can pick it up.

## `src/components/store-manager/ProductEditor.tsx` (orphan, but keep aligned)

Light-touch:
- Replace `defaultFeatures` / Replace any internal category arrays with the new 6 categories (currently it has no category UI, so just add a `<Select>` for category that drives `productType`).
- Add the digital dropzone slot when `productType === 'digital'`.
- Rename the save button to "Yayınla ve Onaya Gönder" to match spec wording.
- I will NOT wire this to mutations (it's not used). A code comment marks it as preview-only.

## `src/components/store-manager/ProductList.tsx` (orphan, but keep aligned)

- Render the "🟠 ONAY BEKLİYOR" badge when `(product as any).status === 'pending_admin_approval'`.

## Out of scope for this part

- The admin approval UI itself (the page where admins review pending products and approve/reject). The DB + RPC are ready; we'll build the surface in Part 3 unless you want it now.
- Automatic Shopify ACTIVE flip on admin approval — easy to wire next once you confirm.

## Open questions (will assume the defaults below if you don't answer)

1. **Digital file size limit**: default to **50MB** for PDFs/ZIPs. Bigger?
2. **Existing products' `status`**: backfill all current rows to `approved`. Confirm — or should we force everything back to pending?
3. **Edit semantics**: should re-editing an already-`approved` product re-enter `pending_admin_approval`? Default: **no, edits stay approved** (only fresh creates go to pending).

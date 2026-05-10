## Goal

Fix three Shopify product regressions reported by the coach panel:

1. Products treated as digital (no shipping required)
2. Inventory not tracked / always zero
3. Products not visible in any sales channel

The current edge functions already use Shopify's **GraphQL Admin API** (2025-07), not the legacy REST endpoints. The plan keeps GraphQL (it is the supported path going forward) and hardens it so the three guarantees actually hold end-to-end. We will not switch to REST `inventory_management` / `requires_shipping` field names — their GraphQL equivalents (`tracked`, `requiresShipping`, `inventorySetQuantities`, `publishablePublish`) achieve the same outcome.

## Changes

### 1. `supabase/functions/create-shopify-product/index.ts`

- Force `status: "ACTIVE"` on `productCreate` (already set — keep, plus add an explicit comment).
- Force every default variant write to include:
  - `inventoryItem.tracked: true` for physical products (already conditional — make it unconditional for `productType === "physical"`, regardless of the incoming `trackInventory` flag, to match the spec).
  - `inventoryItem.requiresShipping: true` for physical products.
  - `inventoryPolicy: "DENY"`.
- Inventory level:
  - For physical products, **always** call `inventorySetQuantities` after create, even when the client did not pass `stockQuantity`. Default to `999` in that case (per spec).
  - Use the first location returned by `locations(first: 1)` as the primary location.
  - Promote inventory failures from silent `warnings` to a hard error, so the UI surfaces them instead of leaving the product at 0.
- Publishing:
  - Keep `publishablePublish` over all `publications`, but treat publish failures as a hard error (currently they are swallowed into `warnings.publications`). A product nobody can see is a failed create.
- Response: still return `{ success, productId, variantId }` plus any non-fatal warnings (only `media` stays best-effort).

### 2. `supabase/functions/update-shopify-product/index.ts`

- When the product is physical, add a corrective variant write that re-asserts `inventoryItem.tracked: true` and `inventoryItem.requiresShipping: true`, so legacy products created before the fix get healed on the next edit.
- Add an explicit `productUpdate` call to set `status: "ACTIVE"` if a previously-broken product is found unpublished. (Cheap idempotent write.)
- Re-publish to all `publications` after an update if the product was previously unpublished — best-effort, surfaced as warning.
- Stock update path stays as-is (already uses `inventorySetQuantities`).

### 3. Frontend (`src/hooks/useStoreMutations.ts`)

No behavioural change required. The hook already forwards `productType`, `trackInventory`, `stockQuantity`. We will:

- Keep `trackInventory` in the payload but document that the edge function ignores it for physical products (always tracked).
- Surface `warnings.inventory` / `warnings.publications` from the edge response in a `toast.warning` so the coach sees partial-success cases.

### 4. No database migration

`coach_products` schema is unaffected — only edge function logic changes.

## Verification

- Create a new physical product with stock = 5 → confirm Shopify Admin shows: Active, Online Store channel published, Track quantity = on, Requires shipping = on, Available = 5 at primary location.
- Create a new physical product with stock omitted → Available = 999.
- Edit an existing legacy product → after save, Track quantity flips on and Requires shipping flips on without resetting stock.
- Create a digital product → Requires shipping off, no inventory write, still Active + published.

## Technical notes

- API version stays at `2025-07` (already in `_shared/shopify-admin.ts`).
- GraphQL mutations used: `productCreate`, `productUpdate`, `productVariantsBulkUpdate`, `productCreateMedia`, `inventorySetQuantities`, `publishablePublish`.
- Required Shopify scopes (already requested in Dev Dashboard): `write_products`, `write_inventory`, `write_publications`. If any are missing the existing `mapShopifyError` 403 branch already produces a clear Turkish error.

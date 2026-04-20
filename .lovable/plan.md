

## Fix `create-shopify-product` for Shopify Admin API 2025-07

### Problem
`productCreate` mutation rejects `variants` field. In Admin API 2025-07, variant pricing and media attachment must be done via separate mutations after product creation.

### Solution: Three sequential GraphQL mutations

Rewrite `supabase/functions/create-shopify-product/index.ts` to execute:

**1. `productCreate`** — create product shell only
```graphql
mutation productCreate($input: ProductInput!) {
  productCreate(input: $input) {
    product {
      id
      variants(first: 1) { edges { node { id } } }
    }
    userErrors { field message }
  }
}
```
Input: `{ title, descriptionHtml, vendor, productType, status: "ACTIVE" }` — no `variants`, no `media`.

Extract `productId` + default `variantId`. Hard fail with 500 if this step errors.

**2. `productVariantsBulkUpdate`** — set the price on the auto-generated default variant
```graphql
mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants { id price }
    userErrors { field message }
  }
}
```
Variables: `{ productId, variants: [{ id: variantId, price: String(price) }] }`.

Best-effort: log errors via `console.error` but continue.

**3. `productCreateMedia`** — attach image
```graphql
mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
  productCreateMedia(productId: $productId, media: $media) {
    media { ... on MediaImage { id } }
    mediaUserErrors { field message }
  }
}
```
Variables: `{ productId, media: [{ originalSource: imageUrl, mediaContentType: "IMAGE", alt: title }] }`.

Best-effort: log errors but continue.

### Response Contract
Always return `{ productId, variantId }` (200) when step 1 succeeds — even if step 2 or 3 logs warnings — so `useStoreMutations.ts` can persist the mapping row in `coach_products`. The frontend stays unchanged.

### Error Handling Matrix

| Step | Failure mode | Behavior |
|------|--------------|----------|
| Auth / payload validation | invalid request | 400/401, no Shopify call |
| `productCreate` userErrors or HTTP error | hard failure | 500 with error detail |
| `productVariantsBulkUpdate` userErrors | soft failure | log + include `priceWarning` in response |
| `productCreateMedia` mediaUserErrors | soft failure | log + include `mediaWarning` in response |

### Deployment
After the rewrite, redeploy `create-shopify-product` and verify by invoking from the Store page (Yeni Ürün). Confirm:
- Product appears in Shopify admin with correct title + price
- Image attached
- Row inserted in `coach_products` with both Shopify IDs

### Files
| File | Change |
|------|--------|
| `supabase/functions/create-shopify-product/index.ts` | Full rewrite — three-step mutation pipeline |

No frontend, schema, or `useStoreMutations.ts` changes required.


## E-Commerce Order Management — Part 1/4: Tab Refactor & Data Hook

### Goal
Evolve the `StoreManager` page from a single-product manager into a full E-Commerce Logistics Hub by introducing tabbed navigation and the foundational data hook for coach orders.

---

### Step A: Create `useStoreOrders` Hook

**File:** `src/hooks/useStoreOrders.ts` (new)

- Query `orders` table via Supabase.
- Apply filters: `.neq('status', 'awaiting_payment')` and `.neq('status', 'pending')` (exclude abandoned checkouts).
- Order by `created_at` descending.
- Return `{ orders, isLoading, error }` shaped for React Query.
- RLS already permits coaches to view their athletes' orders via `is_coach_of(user_id)`.

### Step B: Refactor `StoreManager.tsx` with Tabs

**File:** `src/pages/StoreManager.tsx`

- Import `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `@/components/ui/tabs`.
- Add `useStoreOrders` import.
- Wrap the page in `<Tabs defaultValue="products">`.
- Add `<TabsList>` with two triggers:
  - `value="products"` → label: "Ürün Yönetimi"
  - `value="orders"` → label: "Sipariş & Lojistik"
- Move the existing product grid and upload form into `<TabsContent value="products">`.
- Add `<TabsContent value="orders">` with a temporary placeholder: `<div className="glass rounded-xl border border-border p-10 text-center text-muted-foreground">Siparişler Yükleniyor...</div>`.
- Preserve all existing state, handlers, dialogs, and the Dark-Glass aesthetic.
- No behavioural changes to product creation, editing, deletion, or Shopify sync.

### Verification Checklist

- [ ] Tab switching is smooth and preserves glass styling.
- [ ] Product upload/edit/delete flows remain untouched.
- [ ] `useStoreOrders` compiles and queries the `orders` table with correct filters.
- [ ] No regressions in Shopify product publishing or status toggles.

### Files to Edit
- `src/hooks/useStoreOrders.ts` (new)
- `src/pages/StoreManager.tsx`

### Future Parts (not in this plan)
- Part 2: Order list UI, status badges, and filtering.
- Part 3: Order detail view with shipping/tracking fields.
- Part 4: Order status mutations and fulfilment actions.
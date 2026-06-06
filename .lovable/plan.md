# Shop Production Upgrade — Plan

## Schema Reality Check (Important)

The SQL you provided references `store_orders` and `shopify_products`, but those tables **do not exist** in this project. The actual tables are:

- `public.orders` — has `user_id`, `items` (jsonb), `total_price`, `status`, `shipping_address`, `tracking_number`, `tracking_url`, `carrier_name`, etc. **No `coach_id` column today.** Coach attribution currently flows through `profiles.coach_id` of the buyer (see `get_coach_business_metrics`) and via `items[].coach_id` inside the JSONB cart payload (see `handle_coaching_order_paid`).
- `public.coach_products` — has `coach_id`, `title`, `description`, `price`, `image_url`, `category`, `product_type`, `stock_quantity`, `shopify_product_id`, `shopify_variant_id`. **No `digital_file_url` or `product_kind` today.**

I need to translate your SQL onto the real tables before running it.

## Status token mismatch

Current `orders.status` values used in code: `processing`, `shipped`, `completed`, `cancelled`, `refunded`, plus `paid` (from RPC/triggers).
Your filter tokens requested: `pending`, `shipped`, `delivered`.

I'll map filters to the existing values:
- **Hepsi** → no filter
- **Bekleyen** → `processing` (and `paid` if surfaced)
- **Kargolanan** → `shipped`
- **Teslim Edilen** → `completed`

If you want me to rename the tokens in the DB to `pending`/`delivered` instead, say so and I'll add a data migration.

## Plan

### 1. Database migration (adapted to real schema)
- `ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;` (FK to `profiles`, not `auth.users`, per project convention).
- Backfill existing rows: set `orders.coach_id = profiles.coach_id` of the buyer where currently null.
- Index `orders(coach_id, status, created_at desc)` for the orders list query.
- `ALTER TABLE public.coach_products ADD COLUMN IF NOT EXISTS digital_file_url text;`
- `ALTER TABLE public.coach_products ADD COLUMN IF NOT EXISTS product_kind text NOT NULL DEFAULT 'physical' CHECK (product_kind IN ('physical','digital'));`
- Update `handle_coaching_order_paid` (or add a new trigger) so future `orders` rows have `coach_id` populated from `items[].coach_id` or buyer's `profiles.coach_id`.
- Add/adjust RLS: coaches can `SELECT` orders where `coach_id = auth.uid()` OR `is_active_team_member_of(coach_id)`. Athletes keep current `user_id = auth.uid()` scope.
- Update `get_coach_business_metrics` store revenue branch to prefer `orders.coach_id` and fall back to `profiles.coach_id`.

### 2. `StoreOrdersList.tsx` — segmented filter bar
- Add dark glassmorphic segmented control above the list: `Hepsi | Bekleyen | Kargolanan | Teslim Edilen`.
- Local `useState<'all'|'processing'|'shipped'|'completed'>`; filter the `orders` prop client-side.
- Show per-bucket counts on each pill.
- Extend `OrderItem` type with optional `coach_id: string | null`.

### 3. `OrderFulfillmentSheet.tsx` — rich product rows
For each line in `order.items`:
- **Variant subtitle**: if item has `options` / `variant` / `selectedOptions` (size, color, etc.), render `Varyasyon: Mavi, L` underneath the title.
- **Clickable title** opens a nested `Dialog` (luxury dark style) showing the product image, full description, category and specs — fetched from `coach_products` by `shopify_product_id` or `id` (cached via React Query).
- Reuse `ProductDetailDialog.tsx` if its surface already matches; otherwise add a lightweight nested dialog inside the sheet.

### 4. Totals footer — `Yapılan İndirim` row
Inside the totals grid (Subtotal / Tax / Shipping / Total):
- Compute `discount = max(0, Σ(item.regular_price ?? item.price) * qty - order.total_price - shipping - tax)`.
- Alternatively read `order.shipping_address.discount` or an `items[].discount` field if present (will check at implement time).
- Render an emerald-accented row `Yapılan İndirim −₺X` only when `discount > 0`.

### 5. Type & query updates
- Regenerate `OrderItem` interface in `StoreOrdersList.tsx` and `OrderFulfillmentSheet.tsx` to include `coach_id`.
- Update the orders fetch hook (wherever `from('orders').select(...)` runs for the store manager) to filter by `coach_id = activeCoachId` once the column is populated.

## Questions before I implement

1. Confirm I should map your filter tokens (`pending`/`delivered`) to the existing `processing`/`completed` values, **or** rename the DB values project-wide.
2. Confirm `orders.coach_id` should FK to `public.profiles(id)` (project convention) rather than `auth.users(id)`.
3. The `digital_file_url` will be a signed URL from a new private storage bucket on purchase, or a plain public URL stored on the product? (Affects whether we add a `digital-products` bucket + RLS now.)

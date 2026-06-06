## Part 1/3 — IBAN column + all-time business metrics RPC

Single migration, no application code changes (frontend already consumes `get_coach_business_metrics` via `useBusinessMetrics`).

### Schema change
- `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS iban TEXT;`
  - Nullable, no default. Coaches will populate via the "IBAN Bağla" CTA in `PayoutDesk` (wired in a later part).

### RPC overhaul — `public.get_coach_business_metrics(coach_uuid uuid)`

Replace the existing function body. Keeps the same signature and JSON keys the frontend already reads (`total_package_revenue`, `total_store_revenue`, `paid_custom_revenue` → renamed `total_custom_revenue` plus a kept alias, `pending_custom_revenue`, `total_revenue`, `active_athletes`). All sums are **all-time** (no date filter).

Adaptations vs the prompt's SQL, because the referenced tables don't exist in this project:

| Prompt SQL | Actual table used | Reason |
|---|---|---|
| `payments` WHERE `status = 'succeeded'` | `payments` WHERE `status IN ('paid','succeeded')` | Existing rows use `'paid'`; accept both so future Stripe webhook writes don't break the metric. |
| `store_orders` WHERE `coach_id = …` | `orders o JOIN profiles p ON p.id = o.user_id` WHERE `p.coach_id = coach_uuid AND o.status = 'paid'` | No `store_orders` table; storefront orders attribute to a coach via the buyer's `profiles.coach_id`. |
| `assigned_payments` | unchanged | Already in schema. |
| `coaching_relationships` WHERE `status='active'` | `profiles` WHERE `coach_id = coach_uuid AND role = 'athlete'` | No `coaching_relationships` table; active athletes are profiles linked by `coach_id`. |

`SECURITY DEFINER`, `SET search_path = public`, `LANGUAGE plpgsql` — matches existing definition.

### Return shape

```json
{
  "total_package_revenue":  <numeric>,
  "total_store_revenue":    <numeric>,
  "total_custom_revenue":   <numeric>,  // new key
  "paid_custom_revenue":    <numeric>,  // alias kept for back-compat with existing frontend reads
  "pending_custom_revenue": <numeric>,
  "total_revenue":          package + store + custom,
  "active_athletes":        <int>
}
```

### Out of scope
- IBAN write RPC, masking, validation (later part).
- Frontend changes — `useBusinessMetrics` already reads these keys.
- Indexes — existing `coach_id` / `status` indexes are sufficient at current volume.
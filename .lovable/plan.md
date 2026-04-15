

## Epic 10 - Part 4: Hybrid Order & Logistics Engine (Headless Ready)

### Summary
Evolve the existing `orders` table with headless commerce columns, seed a premium "Kargon Yola Çıktı" shipping template, and create a universal order webhook Edge Function that dispatches order confirmation and shipping notification emails based on status changes.

### Analysis

The `orders` table already exists with: `id`, `user_id`, `items` (jsonb), `status`, `total_price`, `total_coins_used`, `created_at`. We need to **ALTER** it — not recreate — adding the missing headless commerce columns.

The "Sipariş Onayı" template was already seeded in Part 1. We only need the new shipping template.

### Step A — Migration: Evolve `orders` Table + Seed Shipping Template

**ALTER `public.orders`** — add columns:
- `order_type text NOT NULL DEFAULT 'digital'` — 'digital' or 'physical'
- `external_reference_id text UNIQUE` — Shopify/Stripe external ID
- `shipping_address jsonb` — for physical orders
- `tracking_number text` — logistics tracking
- `tracking_url text` — direct tracking link
- `carrier_name text` — shipping carrier name
- `updated_at timestamptz DEFAULT now()`

**RLS policies** on `orders`:
- Users can SELECT their own orders (`user_id = auth.uid()`)
- Coaches can SELECT orders for their athletes (`is_coach_of(user_id)`)
- INSERT for authenticated users (own orders)

**Seed "Kargon Yola Çıktı"** template:
- `name`: 'Kargon Yola Çıktı'
- `category`: 'shipping'
- `is_system`: true, `owner_id`: null
- `subject`: 'Müjde {{isim}}, Dynabolic Paketin Yola Çıktı! 🚚'
- `required_variables`: `["isim", "kargo_firmasi", "takip_no", "takip_linki"]`
- `body_html`: Dark-themed table-based HTML with:
  - `#0f172a` / `#1e293b` background, emerald `#10b981` accents
  - DYNABOLIC brand header
  - Truck/shipping icon hero area
  - Tracking number highlighted in emerald monospace
  - Carrier name display
  - "Kargomu Takip Et" emerald CTA button → `{{takip_linki}}`
  - Footer with platform tagline

HTML snippet preview:
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;">
  <tr><td align="center" style="padding:40px 0;">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;">
      <!-- DYNABOLIC header -->
      <tr><td style="padding:32px;text-align:center;border-bottom:2px solid #10b981;">
        <h1 style="color:#10b981;font-size:24px;margin:0;">DYNABOLIC</h1>
      </td></tr>
      <!-- Shipping icon + title -->
      <tr><td style="padding:40px 32px;text-align:center;">
        <div style="font-size:48px;">🚚</div>
        <h2 style="color:#fff;font-size:22px;">Paketin Yola Çıktı, {{isim}}!</h2>
      </td></tr>
      <!-- Tracking details card -->
      <tr><td style="padding:0 32px 32px;">
        <table width="100%" style="background:#0f172a;border-radius:12px;">
          <tr><td style="padding:16px 24px;color:#94a3b8;">Kargo Firması</td>
              <td align="right" style="padding:16px 24px;color:#fff;font-weight:bold;">{{kargo_firmasi}}</td></tr>
          <tr><td style="padding:16px 24px;color:#94a3b8;">Takip No</td>
              <td align="right" style="padding:16px 24px;color:#10b981;font-family:monospace;font-size:16px;font-weight:bold;">{{takip_no}}</td></tr>
        </table>
      </td></tr>
      <!-- CTA -->
      <tr><td style="padding:0 32px 40px;text-align:center;">
        <a href="{{takip_linki}}" style="display:inline-block;padding:16px 48px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Kargomu Takip Et</a>
      </td></tr>
    </table>
  </td></tr>
</table>
```

### Step B — Create `supabase/functions/handle-universal-orders/index.ts` (NEW)

Webhook-triggered function for `orders` INSERT/UPDATE:
- Extract `record` and `old_record` from payload
- Fetch user profile (`full_name`, `email`) from `profiles`
- **Branch on status change:**
  - `status = 'paid'` (new or changed from 'pending') → Fetch "Sipariş Onayı" template, replace `{{isim}}`, `{{siparis_no}}` (from `external_reference_id` or `id`), `{{paket_adi}}` (from `items`), `{{tutar}}` (from `total_price`)
  - `status = 'shipped'` → Fetch "Kargon Yola Çıktı" template, replace `{{isim}}`, `{{kargo_firmasi}}` (from `carrier_name`), `{{takip_no}}` (from `tracking_number`), `{{takip_linki}}` (from `tracking_url`)
- Send via Resend from `Dynabolic Lojistik <logistics@dynabolic.co>`
- Log to `emails` table (`owner_id = user_id`, direction = 'outbound')
- Always return 200

### Step C — Update `supabase/config.toml` (EDIT)

Append:
```toml
[functions.handle-universal-orders]
verify_jwt = false
```

### Files

| File | Action |
|------|--------|
| Migration SQL | CREATE — ALTER orders + RLS + seed shipping template |
| `supabase/functions/handle-universal-orders/index.ts` | CREATE |
| `supabase/config.toml` | EDIT — add function config |

No DB trigger migration. Webhook configured manually via Dashboard.


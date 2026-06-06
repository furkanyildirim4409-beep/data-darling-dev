## Part 4/6 — Stripe Checkout for Assigned Invoices

Create a new edge function that mints a Stripe Checkout Session for a row in `assigned_payments` and returns the redirect URL.

### New file: `supabase/functions/create-custom-checkout/index.ts`

**Flow**
1. CORS preflight (`OPTIONS` → `corsHeaders`).
2. Auth: read `Authorization` header, create a Supabase client with the caller JWT, call `auth.getUser()` — reject 401 if missing.
3. Parse JSON body, validate with Zod: `{ paymentId: string().uuid() }`.
4. Fetch `assigned_payments` row by `paymentId` using the JWT-scoped client (RLS enforces `athlete_id = auth.uid()`).
   - 404 if not found, 400 if `status !== 'pending'` (already paid / cancelled).
5. Initialize Stripe with `STRIPE_SECRET_KEY` (already set as a secret) using `apiVersion: '2024-06-20'`.
6. Create Checkout Session exactly as specified:
   - `mode: 'payment'`, `payment_method_types: ['card']`
   - Single `line_items[0].price_data` (`currency: paymentRow.currency || 'try'`, `unit_amount: Math.round(amount * 100)`, product name/description)
   - `quantity: 1`
   - `metadata: { payment_id, coach_id, athlete_id, payment_type: 'custom_assigned_invoice' }`
   - `customer_email: user.email`
   - `success_url` / `cancel_url` built from `origin` header (fallback `Deno.env.get('CLIENT_URL')`), pointing to `/athlete/payments?success=true|cancelled=true&payment_id=...`
7. Persist `session.id` into `assigned_payments.stripe_checkout_id` via a **service-role** Supabase client (since `assigned_payments` UPDATE policy only grants coaches/team-members, not athletes).
8. Return `{ url: session.url, sessionId: session.id }` with CORS + JSON headers. Wrap everything in try/catch returning `{ error }` with proper status codes.

**Secrets** — `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are all already configured.

**Config** — `supabase/config.toml` gets a new entry `[functions.create-custom-checkout]` with `verify_jwt = false` (we validate JWT in code, matching the project's existing pattern).

### Out of scope (later parts)
- Stripe webhook → flipping `status` to `'paid'` and stamping `paid_at` (Part 5).
- Frontend "Pay Now" button on the athlete payments page (Part 6).
- Any schema changes — `assigned_payments` already has `stripe_checkout_id`.

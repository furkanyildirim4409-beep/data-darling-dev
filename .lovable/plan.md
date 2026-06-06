## Part 5/6 — Overhaul `NewPaymentDialog` for Custom Coach Invoice Assignment

Refactor the existing payment dialog so coaches dispatch a **custom assigned invoice** to a single athlete that flows through the Stripe checkout built in Part 4. The current dialog writes legacy `payments` rows with a `status`/`payment_date` toggle — that flow does not match the marketplace model (athlete pays via Stripe, status flips on webhook).

### 1. `src/components/business/NewPaymentDialog.tsx` — full rewrite

Dark glass dialog (`bg-card/80 backdrop-blur-xl border-border/60`) with these fields:

| Field | Control | Validation (zod) |
|---|---|---|
| Sporcu | shadcn `Select` of `athletes` from coach roster | required uuid |
| Ödeme Başlığı | `Input` (e.g. "24 Haftalık Yarışma Hazırlık Ek Paketi") | trim, 3–120 chars |
| Tutar (₺) | `Input type=number`, step 50, min 1, max 1,000,000 | positive number |
| Açıklama | `Textarea` 4 rows | optional, ≤ 1000 chars |

Removed: `status` selector, `payment_date` calendar (status starts `pending`, timestamp auto-set; webhook flips to `paid`).

Submit handler calls a new `onSubmit({ athlete_id, title, amount, description })` prop and on success: emerald `toast.success("Fatura sporcuya iletildi")`, full state reset, dialog close, keeps the existing animated success overlay.

### 2. `src/hooks/usePayments.ts` — add `addAssignedPayment`

New async function used by the dialog (kept alongside legacy `addPayment` so nothing else breaks):

```ts
const { data, error } = await supabase.from("assigned_payments").insert({
  coach_id: activeCoachId,
  athlete_id, title, description: description || null,
  amount, currency: "TRY", status: "pending",
}).select("id").single();
```

After success, fire-and-forget insert into `athlete_notifications`:

```ts
await supabase.from("athlete_notifications").insert({
  athlete_id, coach_id: activeCoachId,
  type: "payment_assigned",
  title: "Yeni Ek Hizmet Faturası",
  message: "Koçunuz size yeni bir ek hizmet faturası atadı. Ödemenizi gerçekleştirmek için tıklayın.",
  action_url: `/athlete/payments?invoice=${data.id}`,
  metadata: { assigned_payment_id: data.id, amount, title },
});
```

Push delivery: the existing `athlete_notifications` insert path already powers in-app + native push elsewhere in the app, so we reuse it (no new edge function required for Part 5).

Export `addAssignedPayment` and re-fetch the payouts list via `fetchPayments` so `PayoutDesk` reflects new pending invoices.

### 3. `src/pages/Business.tsx` — wire new prop

Replace `onSubmit={addPayment}` with `onSubmit={addAssignedPayment}` and pull the new function from `usePayments()`.

### Out of scope
- Stripe webhook → `status = 'paid'` (Part 6 territory or already deployed)
- Native push edge function changes
- Schema migrations (table + columns already exist)

### Technical notes
- RLS on `assigned_payments` already permits coach inserts where `coach_id = auth.uid()` (or via team membership via `activeCoachId`).
- `athlete_notifications` insert is best-effort; failure is logged but does not roll back the invoice.
- Zod schema lives at the top of the dialog file; errors render under each field with `text-destructive`.
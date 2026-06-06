## Part 3/6 — Marketplace Escrow & Payout Ledger

Replace the athlete payment status compartment on `/business` with a marketplace-style **Hakediş ve Transfer Takip Masası**. No DB schema work in this part (no IBAN column / payout table yet — those rows will be derived from existing data and a coach-profile field check, with empty states where needed).

### Files

**Edit `src/pages/Business.tsx`**
- Remove `<AthletePaymentStatus ... />` from the layout (also drop its import).
- Insert a new `<PayoutDesk coachId={activeCoachId} payments={payments} />` component below the payments list (same column).

**New `src/components/business/PayoutDesk.tsx`**
- Top: section header "Hakediş ve Transfer Takip Masası" + subtitle "Marketplace tahsilat ve transfer akışı".
- **Bento (3 cards, grid-cols-1 md:grid-cols-3):**
  1. 🏦 **Hakediş (Escrow Balance)** — sum of `payments.amount` where `status in ('paid','succeeded')` AND `payment_date >= now() - 14 days`, scoped to `coach_id = activeCoachId`. Computed client-side from the `payments` prop already loaded.
  2. 🗓️ **Gelecek Transfer Günü** — static label "Her Ayın 1. ve 15. Günü" plus a computed "Sonraki: <date>" line (next 1st or 15th from today, `date-fns`).
  3. 💳 **Banka Hesap Bilgisi (IBAN)** — reads `profiles.payout_iban` (if column exists in current types) else falls back to `null`. Renders masked IBAN `TR•• •••• •••• •••• •••• ••XX` using last 2 digits, or a "IBAN Bağla" button (opens a placeholder toast — wiring deferred to a later part).
- **Payouts History Table** (shadcn `Table`):
  - Columns: Transfer ID (short uuid), Dönem/Tarih (formatted), Tutar (₺), Transfer Durumu.
  - Data source: derive synthetic payout rows by bucketing `payments` (status paid/succeeded) into 14-day clearance windows — rows older than 14 days → `TR GÖNDERİLDİ` (emerald badge), rows within last 14 days → `İŞLEMDE` (amber badge).
  - Empty state when there are no eligible payments.
- Uses semantic tokens for surfaces (`glass`, `border-border`); keeps the spec's exact emerald/amber badge classes as requested.

### Out of scope (later parts)
- Real `payout_iban` column + IBAN form submission.
- Real Stripe Connect payout ingestion / dedicated `payouts` table.
- Removing/refactoring `AthletePaymentStatus.tsx` file itself (left in place, simply unused on this page).

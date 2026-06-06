## Objective
Display a read-only ledger of custom invoices (`assigned_payments`) in `src/pages/Business.tsx`, positioned directly below the top metric stat cards and above the Revenue Split donut.

## Implementation Steps

### 1. Query Hook — `useAssignedPayments`
Create a new hook `src/hooks/useAssignedPayments.ts` that uses `@tanstack/react-query` to fetch from `assigned_payments`.

- Query by `coach_id = activeCoachId` (using `activeCoachId` from `useAuth`, not `user.id`, to preserve sub-coach agency scoping).
- Select: `id, title, amount, status, created_at, paid_at, athlete_id`.
- Join athlete names via a parallel `profiles` fetch or a second `useQuery`, because the Supabase JS client does not reliably type `profiles:athlete_id(...)` joins in this codebase's generated types. Flatten the result into a `AssignedInvoice[]` array ordered by `created_at DESC`.
- Expose `isLoading` and `data`.

### 2. Ledger Component — `CustomInvoicesLedger`
Build a small internal component inside `src/pages/Business.tsx` (or a co-located file) rendered as a full-width `glass` card.

**Card header:**
- Title: "Özel Fatura ve Ödeme Kayıtları"
- Subtitle / count badge showing total record count.

**Table body:**
5-column layout on desktop, collapsing gracefully on mobile:
1. **Tarih** — `created_at` formatted to Turkish short date (e.g. "12 Haz 2026").
2. **Sporcu** — `Avatar` (fallback to initials) + `full_name`.
3. **Açıklama** — `title` of the assigned payment.
4. **Tutar** — `₺1.500,00` formatted with `tr-TR` locale.
5. **Durum** — `Badge`:
   - `paid` → `bg-emerald-500/10 text-emerald-400 border-emerald-500/20` with label "Ödendi"
   - `pending` → `bg-amber-500/10 text-amber-400 border-amber-500/20` with label "Bekliyor"

**Loading state:**
4x `Skeleton` rows matching the existing payment-list skeleton pattern.

**Empty state:**
- `Receipt` icon (import from `lucide-react`).
- Text: "Henüz hiçbir sporcuya özel ödeme/fatura atamadınız."
- Centered inside the card with muted text styling.

### 3. Dashboard Integration
In `src/pages/Business.tsx`:
- Import and call `useAssignedPayments(activeCoachId ?? undefined)`.
- Render the `<CustomInvoicesLedger />` component directly after the stats grid (`{metricsLoading ? ... : ...}` block) and before `<RevenueSplitCard />`.
- Pass `customInvoices` and `invoicesLoading` into the component.

### 4. Design Compliance
- Use only semantic Tailwind tokens (`bg-card`, `text-muted-foreground`, `border-border`, `glass`, etc.).
- No hardcoded colors; leverage existing success/emerald and warning/amber badge patterns already present in the file.
- Keep the same spacing rhythm (`space-y-6`, `p-4`, `divide-y divide-border`) as the existing "Ödeme Kayıtları" list for visual consistency.

## Acceptance Criteria
- [ ] The new ledger renders below the 4 stat cards on the Business page.
- [ ] It displays real `assigned_payments` rows with joined athlete names.
- [ ] Status badges follow the exact color scheme specified.
- [ ] Empty state appears gracefully when no custom invoices exist.
- [ ] Build passes without TypeScript errors.
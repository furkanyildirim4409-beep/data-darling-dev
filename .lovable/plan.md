# Prestige Badge + Subscription Lifecycle Menu on AthleteDetail

## 1. Replace "Seviye N" with live coaching tier badge

`src/pages/AthleteDetail.tsx` currently shows `Seviye {athlete.level ?? 1}` (line 213). Swap it for the active coaching package title fetched from `orders`, mirroring the logic already used in `src/hooks/useAthletes.ts` (lines 163-205).

Implementation:
- Extend `AthleteProfile` with `packageTitle: string | null` and `subscriptionStatus: string | null` (already in `profiles.subscription_status`).
- In `fetchAthleteData`, add a fourth parallel query: `supabase.from("orders").select("created_at, items, expires_at").eq("user_id", id).eq("status", "paid").eq("order_type", "coaching").order("created_at", { ascending: false })`.
- Walk the newest paid coaching order, find the `items[]` entry where `type === "coaching" || item_type === "coaching"`, take its `title`. Fallback to `null`.
- Replace the badge with a premium glass chip:
  ```tsx
  <Badge className="bg-gradient-to-r from-amber-500/15 to-purple-500/15 border border-amber-400/30 text-amber-300 backdrop-blur-md shadow-[0_0_12px_hsl(45_100%_60%_/_0.2)]">
    👑 {athlete.packageTitle ?? "Standart Üyelik"}
  </Badge>
  ```
- When `subscription_status === "frozen"`, append a secondary chip "❄️ Dondurulmuş" next to it.

## 2. Activate the three-dot menu with subscription operations

The header currently has a dead `<MoreHorizontal>` button (line 198). Wrap it in a `DropdownMenu` with three actions, each opening its own controlled dialog. The button itself is gated by `canEditAthletes`.

### 2a. Üyeliği Dondur — Dialog

- `Dialog` with title "🚨 Üyeliği Dondur".
- `<Select>` for duration: `1_week | 2_weeks | 1_month`.
- `<Textarea>` (optional, ≤500 chars) for comment.
- On submit: update `profiles` for this athlete:
  - `subscription_status = 'frozen'`
  - `freeze_until = now() + interval`
  - `freeze_reason = comment || null`
- Schema migration adds `freeze_until timestamptz` and `freeze_reason text` to `public.profiles` (nullable).
- After success: `toast.success("Üyelik dondurulduuz — {duration_label}")`, close dialog, refetch profile.

### 2b. Sözleşmeyi Feshet — AlertDialog

- `AlertDialog` warning: "Sözleşme feshedilecek. Sporcu aktif kadrodan çıkarılacak."
- Confirm action runs:
  - `profiles.update({ coach_id: null, subscription_status: 'terminated', active_program_id: null }).eq("id", id)`.
- After success: `toast.success("Sözleşme feshedildi")`, navigate back to `/athletes`.

### 2c. Ücret İadesi Gönder — Dialog

- `Dialog` with toggle (radio) for `Kısmi İade | Tam İade`.
  - "Tam İade" auto-fills amount from the most recent paid coaching order's `total_price`.
  - "Kısmi İade" exposes a numeric `<Input>` (zod validated, > 0 and ≤ source order total).
- Optional `<Textarea>` for reason.
- On submit, insert a transactional record into `orders`:
  ```ts
  {
    user_id: id,
    items: [{ type: 'refund', source_order_id, reason, refund_kind }],
    total_price: -amount,
    status: 'refund_pending',
    order_type: 'refund',
    external_reference_id: source_order_id,
  }
  ```
- After success: `toast.success("İade talebi kayıt altına alındı")`, refetch.

### Validation & UX

- All form inputs run through small `zod` schemas before DB calls.
- Each submit handler has a local `loading` boolean to disable the trigger button.
- Errors surface via `toast.error(err.message)`.
- Use `navigator.vibrate?.(15)` on successful submit (the "haptic confirmation" the spec asks for).

## 3. Required schema migration

Single migration adds two nullable columns to `profiles`:
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS freeze_until timestamptz,
  ADD COLUMN IF NOT EXISTS freeze_reason text;
```
No new tables, no policy changes — existing RLS on `profiles` already restricts coaches to their athletes via `is_coach_of`. `orders` already has coach-write policies for coaching orders; refund insert reuses them under the same `user_id`.

## Out of scope
- No new tables, no edge functions, no Stripe/refund processor integration — refund is stored as a billing-system record only.
- No automated unfreeze cron — `freeze_until` is captured for downstream logic; flipping `subscription_status` back to `active` will be handled separately.
- ProgramTab / ActiveBlocks untouched.

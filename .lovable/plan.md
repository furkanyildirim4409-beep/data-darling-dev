# Master Notification Aggregator & Header Cleanup (Part 3/4)

## 1. Header Cleanup — Remove Duplicate Bell

In `src/components/layout/TopBar.tsx` there are currently **two** bells:
- `<CoachNotificationBell />` (line 119) — the real persisted inbox.
- A second `<Popover>` (lines 122–213) using `useAlerts()` + a `<Bell>` icon — duplicate/derived feed.

Action: **delete** the entire derived alerts `<Popover>` block plus its now-unused imports (`Bell`, `Popover/Trigger/Content`, `useAlerts`, `useState`/`useMemo`, `getAlertTypeStyle`, `cn`, related state). Keep only the master `<CoachNotificationBell />`. `GlobalSearch.tsx` has no bell — no changes there.

## 2. Master Aggregator Hook

Refactor `src/hooks/useCoachNotifications.ts` to fan-out queries against four Supabase sources in parallel (`Promise.all`) and merge them into one unified feed. Public API of the hook stays the same (`notifications`, `unreadCount`, `markAsRead`, `markAllAsRead`) so `CoachNotificationBell.tsx` keeps working with minor type tweaks.

### Unified shape

```ts
type NotificationType = 'message' | 'system' | 'payment' | 'ticket' | 'compliance_alert' | 'order';

interface NotificationItem {
  id: string;             // namespaced: `msg:<uuid>`, `ledger:<uuid>`, `pay:<uuid>`, `ticket:<uuid>`, `notif:<uuid>`
  title: string;
  description: string;
  created_at: string;
  type: NotificationType;
  read_status: boolean;
  redirect_url: string | null;
}
```

### Sources

1. **Direct Messages** — `messages` where `receiver_id = coach.id` and `read = false` (or `read_at is null`, whichever column exists; verify at implementation time). Title: sender name (joined via `profiles`). Description: `body` truncated. `redirect_url = /messages?athlete=<sender_id>`.
2. **System Alerts / Athlete Warnings** — `coach_action_ledger` where `coach_id = coach.id` and `status = 'pending'`. Maps to `compliance_alert`. `redirect_url = /athletes/<athlete_id>`.
3. **New Purchases / Invoices** — `assigned_payments` where `coach_id = coach.id`, ordered by `updated_at` desc, last 30. Treat `status = 'paid'` rows newer than `last_seen` as unread. Type `payment`. `redirect_url = /payments`.
4. **Ticket / Dispute updates** — `tickets` where `coach_id = coach.id` and `status in ('open','awaiting_coach')` (verify columns). Type `ticket`. `redirect_url = /support/<id>`.
5. **Existing `coach_notifications`** — keep, mapped through the same shape (preserves `order`/`compliance_alert`/`message` rows already inserted by triggers).

All five arrays are concatenated, sorted by `created_at` desc, capped at 50.

### Read state

- For rows backed by `coach_notifications`, continue using `is_read` and the existing mutation.
- For aggregated rows (messages/ledger/payments/tickets) read state is derived. `markAsRead(id)` for these dispatches the appropriate update:
  - `msg:*` → `messages.update({ read: true }).eq('id', ...)`
  - `ledger:*` → no-op locally (status changes via existing action flows); we just optimistically hide.
  - `pay:*`, `ticket:*` → tracked client-side in a `localStorage` set `coach-notif-seen:<coachId>` so badge clears after the user opens the popover.
- `markAllAsRead()` runs the existing bulk update on `coach_notifications` AND writes all current aggregated ids into the local seen-set.

### Realtime

Attach one channel per source (postgres_changes filtered by `coach_id` / `receiver_id`) inside the existing `useEffect`, all listeners added before `.subscribe()`, all cleaned up via `supabase.removeChannel`.

### Badge

`unreadCount = notifications.filter(n => !n.read_status).length` — naturally turns red for any source.

## 3. Files Touched

- `src/components/layout/TopBar.tsx` — delete duplicate bell + dead imports.
- `src/hooks/useCoachNotifications.ts` — rewrite as aggregator (keep export name and surface).
- `src/components/layout/CoachNotificationBell.tsx` — small adjustments: rename `is_read` → `read_status`, `message` → `description`, `action_url` → `redirect_url`, extend `TYPE_META` with `payment` and `ticket` icons.

## Out of Scope

- New DB tables/migrations (all four sources already exist).
- Athlete-side notifications.
- Parts 1, 2, and 4 of launch prep.

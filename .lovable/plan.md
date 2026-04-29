## Coach Notification & Alarm Engine — Part 7

Foundation + UI layer for the Coach OS notification center. No CRON triggers yet — those come in a later part.

### Step A — Database (`coach_notifications`)

Single migration creating the table, indexes, RLS, and realtime publication.

```sql
create table public.coach_notifications (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  athlete_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('order','compliance_alert','message','system')),
  title text not null,
  message text not null,
  is_read boolean not null default false,
  action_url text,
  created_at timestamptz not null default now()
);

create index idx_coach_notifications_feed
  on public.coach_notifications (coach_id, is_read, created_at desc);

alter table public.coach_notifications enable row level security;

-- SELECT own
create policy "Coaches read own notifications"
  on public.coach_notifications for select
  to authenticated
  using (coach_id = auth.uid());

-- UPDATE own (is_read toggle); WITH CHECK pins coach_id immutably
create policy "Coaches update own notifications"
  on public.coach_notifications for update
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- No INSERT/DELETE policy → only service-role (edge functions / future triggers) can write.

alter publication supabase_realtime add table public.coach_notifications;
alter table public.coach_notifications replica identity full;
```

Notes:
- No INSERT policy on purpose — writes will come from edge functions / future DB triggers using service-role, never from the browser.
- `type` is constrained via CHECK so invalid types fail loudly.
- Composite index matches the exact query shape of the feed and the unread-count.

### Step B — Hook (`src/hooks/useCoachNotifications.ts`)

React Query + Supabase Realtime, mirroring patterns already used in `useAlerts` / `useTeamChat`.

- `useQuery(['coach-notifications', userId])` → `select('*').eq('coach_id', userId).order('created_at', desc).limit(50)`.
- `unreadCount` derived client-side from the cached list (avoids a second roundtrip; the list is bounded to 50 and realtime keeps it fresh).
- Realtime: `supabase.channel('coach-notifications:'+userId)` with a `postgres_changes` listener filtered by `coach_id=eq.{userId}` for events `INSERT | UPDATE | DELETE`. Listener attached **before** `.subscribe()`, cleanup via `removeChannel` (per Core memory).
- `markAsRead(id)` → `update({ is_read: true }).eq('id', id)` then optimistic cache patch.
- `markAllAsRead()` → `update({ is_read: true }).eq('coach_id', userId).eq('is_read', false)` then optimistic patch.
- Returns `{ notifications, unreadCount, isLoading, markAsRead, markAllAsRead }`.

### Step C — TopBar Integration

New isolated component `src/components/layout/CoachNotificationBell.tsx` to keep `TopBar.tsx` lean. The existing alerts bell stays as-is (it surfaces compliance/health alerts derived from `useAlerts`); the new bell sits next to it and represents the persisted `coach_notifications` inbox.

- Bell icon (`lucide-react` `Bell`) + red destructive badge when `unreadCount > 0` (cap at `99+`), pulse animation matching existing alert badge.
- `Popover` (Radix) with: header (title + "Tümünü Okundu İşaretle" button when unread > 0), scrollable list (max-h-96, native overflow per Core memory), empty state ("Henüz bildirim yok").
- Per row:
  - Type-driven icon + tint:
    - `order` → `ShoppingBag`, emerald
    - `compliance_alert` → `AlertTriangle`, destructive
    - `message` → `MessageSquare`, primary
    - `system` → `Info`, muted
  - Title (medium weight when unread), message (muted), relative time (`timeAgo` helper reused from `useAlerts`).
  - Unread = subtle `bg-primary/5` + dot indicator, identical to existing notification UI for visual consistency.
  - Click → `markAsRead(id)` then `navigate(action_url)` if present, close popover.
- Footer: "Tüm bildirimleri görüntüle" → no-op for now (route comes later); render only if list is non-empty.

`TopBar.tsx` change is minimal: import `CoachNotificationBell` and render it just before the existing alerts `Popover` in the right-section cluster. Existing alerts bell, profile dropdown, mobile search — untouched.

### Files

| File | Action |
|---|---|
| `supabase/migrations/<ts>_coach_notifications.sql` | Create — table, index, RLS, realtime |
| `src/hooks/useCoachNotifications.ts` | Create — query + realtime + mutations |
| `src/components/layout/CoachNotificationBell.tsx` | Create — bell + popover UI |
| `src/components/layout/TopBar.tsx` | Edit — mount the bell |

### Out of Scope (deferred)

- DB triggers / edge functions that insert rows on order paid, message received, compliance breach — Part 8.
- Push notification fan-out — already handled by `send-chat-push` for chat; will hook in later.
- Dedicated `/notifications` page — footer button is a placeholder for now.

### Acceptance

1. Migration applies cleanly; manually inserting a row via SQL editor (as service role) instantly appears in the bell for the matching coach without refresh.
2. Clicking a row marks it read (badge decrements) and navigates if `action_url` present.
3. "Tümünü Okundu İşaretle" zeroes the badge in one network call.
4. Sub-coaches see only their own `coach_id = auth.uid()` rows (RLS enforced); no cross-tenant leakage.

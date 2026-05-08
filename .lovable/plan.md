# Coach Inbox Restructuring — Part 1/2

Separate paying clients from prospects so they never mix in the coach's chat sidebar. Introduces a tabbed sidebar driven by the existing `chat_rooms` table (`room_type` ∈ {assigned, direct}, `status` ∈ {pending, approved}).

## Final sidebar structure

```
┌───────────────────────────────┐
│ [ Ekip ]   [ Sporcular ]      │ ← top tabs (Messages.tsx)
├───────────────────────────────┤
│  (Sporcular active)           │
│  [ Aktif ]   [ Direct (3) ]   │ ← sub-tabs in CoachInbox
├───────────────────────────────┤
│ AKTİF view:                   │
│   • Assigned athletes list    │   (room_type='assigned')
│                               │
│ DIRECT view:                  │
│   ─ İstekler (3) ─────────    │   (status='pending') with badge
│     • prospect A   [Kabul][X] │
│   ─ Mesajlar ────────────     │   (status='approved')
│     • prospect B               │
└───────────────────────────────┘
```

## Scope

- Restructure sidebar UI only (Part 1/2).
- Approve/Decline actions, prospect message view and "Part 2" coach-side wiring will be handled in the follow-up.
- No DB migration required — `chat_rooms` already has `room_type` and `status`.

## Steps

### 1. Data layer — extend `useCoachChat`

`src/hooks/useCoachChat.ts`

- Fetch `chat_rooms` for `coach_id = activeCoachId` and join with `profiles` for the athlete side.
- Annotate each `ChatAthlete` with:
  - `room_type: 'assigned' | 'direct'`
  - `status: 'pending' | 'approved'`
  - `room_id: string`
- Keep current assignment-scoping rules for restricted sub-coaches (assigned-only sub-coaches see `room_type='assigned'` only — Direct tab is hidden for them).
- Existing latest-message + unread aggregation logic stays; we just attach room metadata.

### 2. Sidebar component — `CoachInbox.tsx`

- Add internal `view` state: `'active' | 'direct'`.
- Render a sub-tab bar (Tabs from `@/components/ui/tabs`) under the search input:
  - "Aktif" — count of `room_type='assigned'`
  - "Direct" — count of pending requests as a destructive badge
- Filter the existing list according to `view`:
  - `active`: rows where `room_type === 'assigned'`
  - `direct`: rows where `room_type === 'direct'`, split into two labelled sections:
    - "İstekler" → `status === 'pending'` (small ping/badge style, muted background)
    - "Mesajlar" → `status === 'approved'`
- Keep current row UI (avatar, name, latest message, unread dot).
- Empty states per view ("Henüz aktif sporcu yok", "Bekleyen istek yok", "Henüz direkt mesaj yok").

### 3. Page wiring — `Messages.tsx`

- No change to top-level Ekip / Sporcular tabs (already exist).
- Pass through new fields from `useCoachChat`.
- When user clicks a pending request row, still open `ActiveChat` in read-only/preview state; the Approve/Decline UI will be added in Part 2 (out of scope here, but the row click must not crash).

## Technical notes

- `chat_rooms` columns confirmed: `id, athlete_id, coach_id, room_type, status, created_at, updated_at`.
- Restricted sub-coaches: hide the "Direct" sub-tab entirely (they cannot manage prospects per IP/roster rules).
- Realtime: subscribe to `chat_rooms` inserts/updates filtered by `coach_id` so new requests appear live and the badge increments instantly.
- No semantic-token violations: badge uses `bg-destructive`, section labels use `text-muted-foreground`.

## Files touched

- `src/hooks/useCoachChat.ts` — add room metadata + realtime subscription.
- `src/components/chat/CoachInbox.tsx` — sub-tabs, sectioning, badges.
- `src/pages/Messages.tsx` — minor prop pass-through if needed.

## Out of scope (Part 2)

- Approve / Decline RPC + buttons.
- Prospect-side request inbox.
- Auto-promotion of `direct` → `assigned` once a package is purchased.

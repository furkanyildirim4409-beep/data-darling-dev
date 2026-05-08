# Message Request Approval UI — Coach Part 2/2

Wire up Approve / Decline for pending `chat_rooms` so a coach must explicitly accept a prospect before two-way messaging opens.

## Behavior

- When `athlete.room_type === 'direct'` AND `athlete.room_status === 'pending'`:
  - Replace the message input area entirely with a sticky bottom action bar.
  - Action bar copy: "Bu sporcu sana mesaj göndermek istiyor."
  - Two full-width buttons: `Reddet` (outline + destructive text) and `Kabul Et` (primary).
  - Subtle slide-up entrance animation.
- Approve → update `chat_rooms.status = 'approved'`. Local state flips instantly so the standard input box renders immediately.
- Decline → update `chat_rooms.status = 'rejected'`. Sidebar removes the row; `ActiveChat` clears selection and shows the empty state.
- While an action is in flight, both buttons show a spinner and are disabled.
- Coach can still scroll/read the prospect's existing messages; only the input is gated.

## Files touched

### 1. `src/hooks/useCoachChat.ts`
- Extend `ChatRoomStatus` to include `'rejected'`.
- Add `respondToRequest(athleteId: string, action: 'approve' | 'decline')`:
  - Look up the athlete's `room_id` from current state.
  - `update chat_rooms set status = 'approved' | 'rejected' where id = room_id`.
  - On approve: mutate local `athletes` to flip `room_status` and keep selection.
  - On decline: drop the athlete from local `athletes`, clear `selectedAthleteId`, clear `messages`.
- Filter rejected rooms out of the inbox in `fetchAthletes` (don't show them in either list).
- Export `respondToRequest`.

### 2. `src/pages/Messages.tsx`
- Pull `respondToRequest` from `useCoachChat` and pass it to `ActiveChat`.

### 3. `src/components/chat/ActiveChat.tsx`
- Add prop `onRespondToRequest?: (athleteId: string, action: 'approve' | 'decline') => Promise<void> | void`.
- Compute `isPending = athlete?.room_type === 'direct' && athlete?.room_status === 'pending'`.
- When `isPending`:
  - Don't render the recording / file / input form block at all.
  - Render the new `<RequestActionBar />` in its place.
- New inline `RequestActionBar`:
  - Sticky to bottom, glassmorphic: `bg-card/80 backdrop-blur-md border-t border-border`.
  - Title row with `Inbox` icon + the prompt text.
  - Two buttons: `Reddet` (variant `outline` + `text-destructive border-destructive/40 hover:bg-destructive/10`), `Kabul Et` (variant `default`, full bleed).
  - Loading: `Loader2` spinner inside the clicked button, both disabled.
  - Animation: `animate-in slide-in-from-bottom-4 fade-in duration-300`.

## Technical notes

- `chat_rooms.status` text column already exists; no migration needed for the value `'rejected'`.
- RLS: coach can update their own room (existing policy on `chat_rooms` covers `coach_id = auth.uid()` or active team member). If RLS update fails we will surface a toast but no migration in this part.
- Sub-coaches with restricted permission don't see Direct tab at all (handled in Part 1), so they won't reach this UI.
- No semantic-token violations: action bar uses `bg-card/80`, `border-border`, `text-destructive`, `bg-primary`.

## Out of scope

- Auto-promotion of a `direct` room to `assigned` after a package purchase (already handled by the existing `handle_coaching_order_paid` trigger updating `profiles.coach_id`; the room remains `direct` which is acceptable).
- Athlete-side request inbox / sending UI.

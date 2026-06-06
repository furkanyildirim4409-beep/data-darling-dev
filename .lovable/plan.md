## Goal
Wire the "Hızlı Duyuru" card in `src/pages/Alerts.tsx` to actually send a broadcast to every athlete bound to the active coach (head coach or sub-coach scope), persist an in-app row per athlete, and fan out push notifications.

## Schema corrections (deviate from spec)
- No `coaching_relationships` table exists. Athletes are linked via `profiles.coach_id = activeCoachId` (with `role = 'athlete'`). For restricted sub-coaches, the assigned athlete subset comes from `team_member_athletes` (same pattern already used in `useAlerts` / `fetchAiInterventions`).
- `athlete_notifications` columns are `athlete_id`, `coach_id`, `title`, `message`, `type`, `is_read`, `metadata` — NOT `profile_id`/`body`/`category`.
- Push function `send-chat-push` is already used elsewhere (and was just wired into single/bulk check-in reminders); same invocation pattern reused.

## File touched
- `src/pages/Alerts.tsx`

## Changes
1. **State**
   - Replace existing `quickMessage` with `announcement` (rename for clarity, or keep `quickMessage` — keep the existing name to minimize churn). Add `broadcastSending` boolean.
2. **Athlete resolution helper inside `handleSendBroadcast`** — mirrors `fetchAiInterventions` scoping:
   - If `isSubCoach && teamMemberPermissions !== 'full'`: fetch `team_member_athletes.athlete_id` for `teamMember.id`.
   - Else: select `profiles.id` where `coach_id = activeCoachId AND role = 'athlete'`.
   - Bail with destructive toast if empty.
3. **Batch insert** into `athlete_notifications` — one row per athlete with:
   ```ts
   { athlete_id, coach_id: activeCoachId, title: "Koçunuzdan Yeni Duyuru 📢",
     message: announcement, type: 'announcement', is_read: false }
   ```
   Chunk to 500 rows per insert (per project Core rule: "Use 500-row chunked inserts for bulk ops").
4. **Fan-out push** via `Promise.allSettled` calling `send-chat-push` with `{ userId, title, body: announcement }` — silent on per-athlete failures.
5. **UI wiring**
   - Disable the "Hepsine Gönder" button while `broadcastSending` is true; swap `Send` icon for a spinner (`Loader2` from lucide with `animate-spin`).
   - Clear `quickMessage` only on successful insert.
   - Toast: success `"Duyuru gönderildi"` with `"${count} sporcuya iletildi"`; destructive on insert failure.
6. **Reuses**: `toast` from `@/hooks/use-toast` (already imported), `supabase` client (already imported), `useAuth` already destructures `activeCoachId/isSubCoach/teamMember/teamMemberPermissions`.

## Out of scope
- No DB migration. RLS already permits coaches to insert `athlete_notifications` for their own athletes (existing single-reminder path proves this).
- No new edge function. No analytics/dedupe.
- The card title/textarea/Button JSX stay where they are (right sidebar of the alerts grid).

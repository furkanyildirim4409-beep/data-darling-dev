

## Wire TeamChatDialog to Real Supabase Backend

### Problem
`TeamChatDialog.tsx` uses hardcoded mock messages. `TeamMember.id` maps to `team_members.id` (row ID), not `user_id` (auth ID), which is what `useTeamChat` needs. The `TeamMember` interface lacks a `user_id` field entirely.

### Changes

**1. Add `user_id` to `TeamMember` interface and mapping** (`MemberProfileDrawer.tsx` + `useTeam.ts`)
- Add `userId?: string | null` to the `TeamMember` interface
- Map `row.user_id` to `userId` in `mapRowToTeamMember`

**2. Rewrite `TeamChatDialog.tsx`**
- Change props: accept `memberUserId?: string | null` instead of just name/initials/role
- Import and use the `useTeamChat` hook
- On dialog open (`useEffect` on `open + memberUserId`): call `selectContact(memberUserId)` if valid
- Guard: if `memberUserId` is null/undefined, show disabled placeholder: "Bu kullanıcının henüz aktif bir hesabı yok."
- Render messages from the hook's `messages` array, mapping `sender_id === user.id` to "me" vs "other"
- Wire input to `sendMessage(content)` from the hook
- Add auto-scroll via `useRef` + `useEffect` on messages length
- Show loading skeleton when `isLoadingMessages` is true
- Remove all mock data and local message state

**3. Update `Team.tsx` call site**
- Pass `memberUserId={chatMember.userId}` to `TeamChatDialog`

**4. Remove fake notification simulation**
- Delete the `setInterval` in `Team.tsx` that calls `simulateIncomingMessage` — the real `useTeamChat` hook handles unread counts via realtime now


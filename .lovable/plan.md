# Story Reply Support & Multi-User Chat

## Step A — DB: `messages.metadata` JSONB

The chat table in this project is `public.messages` (not `coach_messages`). Add a JSONB metadata column to carry story-reply context.

Migration:
```sql
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_messages_metadata_story
  ON public.messages ((metadata->>'story_id'))
  WHERE metadata ? 'story_id';
```

Expected payload athletes will send:
```json
{ "story_id": "<uuid>", "media_url": "<https url>", "category": "..." }
```

## Step B — `ActiveChat.tsx`: render story-reply bubble

In the message bubble, before the existing media/text blocks, render a small "replied to your story" preview when `msg.metadata?.story_id` exists:

- 56×80 rounded thumbnail using `metadata.media_url` (image or video poster fallback to a play icon).
- Caption row above thumbnail: "Hikayene yanıt verdi" (athlete) or "Hikayene yanıt" (coach side, mirrored).
- Subtle border + reduced opacity background so the reply text remains primary.
- Click thumbnail → opens `metadata.media_url` in a new tab (lightweight; no full story viewer needed for v1).

Type update in `useCoachChat.ts`:
```ts
export interface ChatMessage {
  ...
  metadata?: { story_id?: string; media_url?: string; category?: string } | null;
}
```
Include `metadata` implicitly via existing `select('*')` queries — no query change required.

## Step C — `useCoachChat.ts`: surface ANY athlete sender

Today the inbox only lists profiles where `profiles.coach_id = activeCoachId`. A story reply from an athlete that isn't on the coach's roster (or is scoped out for a sub-coach with `full` perms not set) would be invisible.

Changes:
1. After fetching scoped `profiles`, also fetch **all distinct sender_ids** from `messages` where `receiver_id = coachId` in the last 90 days.
2. For any sender_id not already in `profiles`, fetch a lightweight profile (`id, full_name, avatar_url`) and append as a "Misafir" / unassigned athlete entry.
3. Sub-coach scoping: only apply the assigned-athlete filter when `teamMemberPermissions !== 'full'` AND the sender is already a roster athlete; story-reply senders bypass roster filter (coach-level decision — these are direct DMs to the user).
4. Realtime INSERT handler: if `senderId` not present in `athletes` state, trigger `fetchAthletes()` (debounced) so the new conversation appears immediately. Currently it silently no-ops.
5. Unanswered counter (`useUnansweredChats`) already keys on receiver=coachId, so it will pick these up once the athlete IDs are passed in. Update `Messages.tsx`/inbox to source athleteIds from the merged list.

## Step D — Optimistic & sent payloads

`sendMessage` does not need to write metadata (coach replies are plain text). Athlete-side mobile app will write metadata on inbound story replies. We just read & render it.

## Files

- **New**: `supabase/migrations/<ts>_messages_metadata.sql`
- **Edit**: `src/hooks/useCoachChat.ts` — extend `ChatMessage`, add unassigned-sender merge, refresh on unknown sender realtime event.
- **Edit**: `src/components/chat/ActiveChat.tsx` — render story-reply preview block.

## Out of scope (v1)
- Full in-app story viewer modal (link-out is sufficient).
- Coach-initiated replies that themselves quote a story.

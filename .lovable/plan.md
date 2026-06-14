# Unsend Message ("Mesajı Geri Al") — Part 5/5

## Schema

Add a soft-delete flag to `public.messages` via migration:

```sql
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
```

No new RLS policy needed: the existing UPDATE policy already restricts edits to participants (used today for `is_read`). The mutation will additionally `.eq('sender_id', user.id)` defensively so only the original sender can flip the flag.

## Types

Extend `ChatMessage` in `src/hooks/useCoachChat.ts`:

```ts
export interface ChatMessage {
  // ...existing fields
  is_deleted?: boolean;
}
```

Add `is_deleted` to every `messages` `select(...)` in the hook (initial load, older-page loader, and the realtime INSERT echo path uses `payload.new` directly so it auto-includes the column).

## Mutation

New method on `useCoachChat`:

```ts
const unsendMessage = useCallback(async (messageId: string) => {
  if (!coachId) return;
  // optimistic
  setMessages(prev => prev.map(m =>
    m.id === messageId ? { ...m, is_deleted: true, content: '🚫 Bu mesaj silindi.', media_url: null, media_type: null, metadata: null } : m
  ));
  const { error } = await supabase
    .from('messages')
    .update({ is_deleted: true, content: '🚫 Bu mesaj silindi.' })
    .eq('id', messageId)
    .eq('sender_id', coachId);
  if (error) {
    // rollback by refetching
    // (cheap: just reload the open thread)
  }
}, [coachId]);
```

Also patch the inbox preview: after a successful unsend, update the matching `athletes[i].latestMessage.content` to `'🚫 Bu mesaj silindi.'` so the sidebar reflects it instantly.

Return `unsendMessage` from the hook and pass it through `Messages.tsx` → `ActiveChat`.

## Realtime

In the existing `coach-inbox-realtime` channel:

1. Extend the current sender-side UPDATE listener (`filter: sender_id=eq.${coachId}`) to also merge `is_deleted`/`content` changes — today it short-circuits when `!is_read`. Replace with a merge that updates whatever fields changed:
   ```ts
   setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
   ```
2. Add a new UPDATE listener with `filter: receiver_id=eq.${coachId}` so when an athlete unsends a message addressed to the coach, the coach's open thread updates live. Same merge logic. Also rewrite the matching `athletes[i].latestMessage.content` if the deleted message is the latest preview.

Both listeners stay attached before `.subscribe()` per project realtime rules; cleanup via the existing `removeChannel`.

## UI — chat bubble (`src/components/chat/ActiveChat.tsx`)

Add `onUnsend?: (messageId: string) => void` to `ActiveChatProps`. Wire it from `Messages.tsx`.

Wrap each message bubble (`isCoach` branch) in a shadcn `<ContextMenu>` plus a small hover-only "Trash" button for non-touch users:

- Right-click anywhere on a coach-authored bubble → `<ContextMenuItem>` "Mesajı Geri Al" → `AlertDialog` confirm → `onUnsend(msg.id)`.
- On hover, render a `<Button variant="ghost" size="icon">` with `Trash2` icon positioned inline next to the bubble (flex sibling, not absolute) — visible only when `isCoach && !msg.is_deleted` and on `group-hover`.
- Trigger only renders when `msg.sender_id === coachId && !msg.is_deleted`. Athlete-authored bubbles never get the menu.

Deleted-bubble rendering (for both directions):

```tsx
if (msg.is_deleted) {
  return (
    <div className={cn("flex", isCoach ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[75%] px-3.5 py-2 rounded-2xl text-sm italic flex items-center gap-1.5",
        "bg-muted/40 text-muted-foreground border border-dashed border-border"
      )}>
        <Ban className="w-3.5 h-3.5" />
        <span>🚫 Bu mesaj silindi</span>
      </div>
    </div>
  );
}
```

Place this branch before the existing story-reply preview / media / text rendering so attachments, story-reply cards, read receipts, and timestamps are all suppressed for deleted messages.

## QuickChatPopover

Out of scope for this part — it's a lightweight athlete-card popover. Mention to user that the same pattern can be applied later if they want unsend in popover too.

## Athlete app

This repo is the coach platform; the athlete app is a separate codebase. The DB column + the realtime merge for `receiver_id=eq.coachId` already give the coach the live "athlete unsent" state. Parity work on the athlete app is owned by that repo's own PR.

## Files touched

- New migration: add `is_deleted` to `public.messages`.
- `src/hooks/useCoachChat.ts` — type, selects, mutation, realtime merge, latestMessage rewrite.
- `src/pages/Messages.tsx` — thread `onUnsend` prop through.
- `src/components/chat/ActiveChat.tsx` — context menu + hover trash, deleted-bubble rendering, AlertDialog confirm.

## Root Cause

The frontend already invokes `send-chat-push` with `{ userId, title, body }` for both "Hızlı Duyuru" (broadcast) and "Hatırlat" (single + bulk reminder). The actual bug is **server-side**: `supabase/functions/send-chat-push/index.ts` only handles the database webhook shape and short-circuits everything else:

```ts
if (type !== "INSERT" || table !== "messages") {
  return new Response(JSON.stringify({ skipped: true }), ...);
}
```

So every announcement/reminder call returns `{ skipped: true }` and no native push is ever dispatched. That's why in-app inbox rows are created but mobile notifications never arrive.

## Fix Plan

### 1. `supabase/functions/send-chat-push/index.ts` — accept direct payload

Detect two payload shapes:

- **Webhook shape** (existing): `{ type: "INSERT", table: "messages", record: {...} }` → keep current behaviour (resolve sender name, build chat preview, route to `/messages`).
- **Direct shape** (new): `{ userId, title, body, data? }` → look up `push_subscriptions` for `user_id = userId` and send the provided `title` / `body` verbatim, with a sensible default `data.url` (e.g. `/`) merged with any caller-supplied `data`.

Shared logic (VAPID setup, `webpush.sendNotification`, 410 cleanup of expired endpoints, `Promise.allSettled` aggregation, CORS, error handling) is reused for both branches.

If neither shape matches, return `400` with a clear error instead of silently skipping.

### 2. Frontend — no functional change required

The existing calls in `src/pages/Alerts.tsx` (`handleSendBroadcast`, `handleBulkRemind`) and `src/utils/checkinReminder.ts` (`sendCheckinReminder`, used by `AlertActionCard`) already match the new direct payload contract. Once the edge function honours it, "Hızlı Duyuru" and "Hatırlat" will dispatch native pushes.

Optional polish (only if you want it included):
- Standardise the broadcast title to `"Koçunuzdan Yeni Duyuru 📢"` (currently `"Koç Duyurusu 📢"`) to match the spec.
- Add a `console.error` around each `functions.invoke` call so failures surface in dev tools.

### 3. Verification

- Deploy the updated function (automatic).
- Trigger one broadcast and one reminder from `/alerts`, then check Edge Function logs for `"Push sent: { sent: N, failed: 0 }"` instead of `skipped`.
- Confirm a real device with an active `push_subscriptions` row receives the notification.

## Out of Scope

- No schema/RLS/migration changes.
- No changes to chat message push behaviour — webhook branch stays byte-for-byte the same.
- No new secrets (VAPID keys already configured).
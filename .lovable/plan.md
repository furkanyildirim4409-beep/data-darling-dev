# Plan

## 1. Chat media path → signed URL resolver

### New helper: `src/lib/mediaUrl.ts`
- `isHttpUrl(v?: string | null): boolean` — true if value starts with `http://` / `https://`.
- `resolveMediaUrl(value?: string | null, bucket = 'chat-media', ttl = 3600): Promise<string | null>` — null-safe; passes through http URLs; else calls `supabase.storage.from(bucket).createSignedUrl(value, ttl)` and returns `signedUrl` (or null on error).
- `resolveChatMessagesMedia<T extends { media_url?: string | null }>(messages: T[]): Promise<T[]>` — collects rows whose `media_url` is a bare path, calls `createSignedUrls(paths, 3600)` in one batch, maps results back preserving order; leaves http rows untouched. Handles empty input.

### Wire the resolver into every read path
For each of the following, resolve `media_url` **before** committing to state (initial fetch, load-older, realtime INSERT, optimistic self-echo of a just-uploaded file):

- `src/hooks/useCoachChat.ts`
  - `fetchMessages` — `setMessages(await resolveChatMessagesMedia(fetched))`
  - `loadOlderMessages` — resolve `older` batch before prepending
  - realtime INSERT branch (line ~447) — resolve the single `newMsg` via `resolveMediaUrl` before pushing
  - `sendMessage` optimistic branch — if `mediaUrl` is provided (bare path), resolve it for the optimistic bubble; still write the bare path to DB
- `src/components/athletes/QuickChatPopover.tsx` — same three branches (initial load, realtime insert, optimistic send)
- `src/components/athlete-detail/ChatWidget.tsx` — same
- `src/components/chat/ActiveChat.tsx` — only renders `msg.media_url`, so no extra fetch work here; it relies on the hook. However the story-reply meta path (`meta.media_url`) is unrelated (stories are public) — leave it alone.

### Upload path: `src/hooks/useMediaUpload.ts`
- Remove the `createSignedUrl(1 year)` call.
- After a successful `.upload(fileName, ...)`, call `onUploadComplete(fileName, type)` with the **bare storage path**.
- Callers already pass this value into `sendMessage`, which writes it into `messages.media_url`. The optimistic bubble is signed on the fly via the resolver above.

### Challenge messages
- `challenge_messages.media_url` is also now a path. Grep confirms it isn't rendered in the coach panel today (no matches under `src/`). No changes; the helper is reusable if a surface appears later.

## 2. Review moderation queue in Store Manager

### New component: `src/components/store-manager/ReviewModerationQueue.tsx`
- Query: `product_reviews` where `is_approved = false`, order by `created_at desc`. RLS scopes to the coach's products.
- Enrich in two parallel queries:
  1. `coach_products` — select `shopify_product_id, title, image_url` for the distinct `product_id`s from the reviews (join key: `coach_products.shopify_product_id = product_reviews.product_id`).
  2. `get_public_profiles(_ids := [...userIds])` RPC — for the reviewer `user_id`s (reviewers may not be the coach's athletes, so `profiles` is unreadable directly).
- Card layout: product title + thumbnail, reviewer avatar + name, star rating, comment text, optional review `image_url`, timestamp, and two buttons:
  - **Onayla** → `update({ is_approved: true }).eq('id', id)`
  - **Reddet/Sil** → `delete().eq('id', id)`
- Both actions invalidate the queue query on success (React Query) and toast the result.
- Empty state: "Bekleyen yorum yok."

### Mount point: `src/pages/StoreManager.tsx`
- Add a new section (tab or panel, matching existing layout conventions) titled "Yorum Onayları" that renders `<ReviewModerationQueue />`. A small unread-count badge on the tab if `count > 0`.

## 3. Regenerate Supabase types

After the migration-side changes (already applied server-side), refresh `src/integrations/supabase/types.ts` so `get_public_profiles` and the new defaults are reflected. This is handled by the standard type regen step — no manual edit.

## Out of scope (confirmed)
- Disputes UI — unchanged per user note.
- Stories / social posts / highlights media — those buckets/columns remain public URLs; the resolver is a no-op on http values if ever reused there.

## Files touched
- Add: `src/lib/mediaUrl.ts`, `src/components/store-manager/ReviewModerationQueue.tsx`
- Edit: `src/hooks/useCoachChat.ts`, `src/hooks/useMediaUpload.ts`, `src/components/athletes/QuickChatPopover.tsx`, `src/components/athlete-detail/ChatWidget.tsx`, `src/pages/StoreManager.tsx`

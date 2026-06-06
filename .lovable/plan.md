# Content Studio — Real Analytics, IG Sync & 1:1 Mobile Preview (Part 3/3)

## 1. Database migration

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_sync_active boolean NOT NULL DEFAULT true;
```

Extend `update_own_profile` RPC (security definer, whitelist pattern) with two new params so the field can be updated safely from the client:
- `_username text`
- `_instagram_sync_active boolean`

Both `COALESCE`-merged into `profiles` like the other fields.

## 2. `ProfileSettings.tsx`

- Bind a new "Kullanıcı Adı" field directly to `profiles.username`. Local state `username` initialized from `authProfile.username`, saved via `update_own_profile({ _username })`.
- Light validation: lowercased, `^[a-z0-9._]{3,30}$`. On conflict (`23505`), toast "Bu kullanıcı adı zaten alınmış".
- Rename the "İstatistikleri Eşitle" card to **"Instagram İçeriklerini Eşitle"** and add the toggle label **"Otomatik Eşitleme (Arka Plan)"**.
- Replace local `syncStats` state with `instagramSyncActive` bound to `profiles.instagram_sync_active`. Saving toggles call `update_own_profile({ _instagram_sync_active: next })` immediately (optimistic) so the preview reacts live.
- **Delete the "Doğrulanmış Profil" card entirely.**
- **Purge the four mock stat tiles** (Takipçi/Takip/Gönderi/Etkileşim using `profile.*` mock numbers).

## 3. Real follower stats

New hook `useCoachAudienceStats()` in `useSocialMutations.ts`:

```ts
// Parallel queries
const [followers, students] = await Promise.all([
  supabase.from("user_follows").select("id", { count: "exact", head: true }).eq("followed_id", user.id),
  supabase.from("profiles").select("id", { count: "exact", head: true })
    .eq("coach_id", user.id).eq("role", "athlete"),
]);
return {
  totalFollowers: followers.count ?? 0,
  activeStudents: students.count ?? 0,
  nonStudentFollowers: Math.max((followers.count ?? 0) - (students.count ?? 0), 0),
};
```

Two cards in `ProfileSettings.tsx` (replacing the four mock tiles):
- **Toplam Takipçi** — `totalFollowers` (Users icon)
- **Öğrenci Olmayan Takipçiler** — `nonStudentFollowers` (UserMinus icon), subtitle: `{activeStudents} aktif öğrenci`

Loading state: skeleton placeholders. Empty state: "0" with muted styling (no mock fallbacks).

## 4. `MobileProfilePreview.tsx` — Instagram-style real data

Mirror an Instagram-style coach profile populated from the live database, matching the avatar-app's coach profile layout:

**Data sources (React Query)**
- Bio/avatar/name/username/title → existing `ProfileContext` (already authProfile-backed)
- Audience stats → `useCoachAudienceStats()`
- Posts count → number of published `social_posts` for this coach (new `useMyPublishedPostsCount`) — already available via existing query patterns
- Highlights row → `useCoachHighlights()` filtered to `showOnProfile && count > 0`
- Grid → `useMyPublishedPosts()` new lightweight query: `social_posts where coach_id = user.id and status='published' order by created_at desc limit 9`, return first non-null of `image_url | before_image_url | after_image_url | video_thumbnail_url`. Gate behind `instagram_sync_active` (when false the grid renders a paused empty state — "Eşitleme duraklatıldı").

**Layout (220×~440 phone frame)**
```
┌──────────────────────────┐
│  status bar              │
│  @username    ⚙          │  ← top header with real username
├──────────────────────────┤
│  ◯avatar    posts followers following │  ← real counts
│  Full Name (bold)                     │
│  Title (primary muted)                │
│  Bio (3 lines)                        │
│  [Takip Et] [Mesaj]                   │
│  ◯◯◯◯◯ highlights (real covers, names)│
├──────────────────────────┤
│  ▦ ▷ 👤  (tab bar)                    │
├──────────────────────────┤
│  3-col grid of real post thumbs       │
└──────────────────────────┘
```

- Highlight circles: rendered from `useCoachHighlights()`, max 5 visible, horizontal scroll, names truncated under each circle.
- Empty grid → 9 muted dashed placeholders with "Henüz gönderi yok".
- When `instagram_sync_active === false` → grid replaced by centered icon + "Otomatik eşitleme kapalı" so the visual pause is obvious.
- Remove all `unsplash.com` mock URLs and any `profile.followers/posts/following` reads.

## 5. Files touched

- `supabase/migrations/<new>.sql` — `instagram_sync_active` column + updated `update_own_profile` RPC
- `src/hooks/useSocialMutations.ts` — add `useCoachAudienceStats`, `useMyPublishedPosts`, `useMyPublishedPostsCount`
- `src/contexts/AuthContext.tsx` — ensure `profile.username` and `profile.instagram_sync_active` are selected (verify selector)
- `src/components/content-studio/ProfileSettings.tsx` — username field, IG sync rename + toggle binding, delete verified card, replace mock stats with real cards
- `src/components/content-studio/MobileProfilePreview.tsx` — full rewrite to real data + IG sync gating

## Out of scope

- ContentStudio.tsx page-level toolbar (the IG sync card lives inside ProfileSettings per current structure; no separate page-level card exists). If the user expected a top-level "İstatistikleri Eşitle" card, confirm and I'll move it.
- No new RLS — `profiles` policies already let users update their own row via the existing RPC pattern.

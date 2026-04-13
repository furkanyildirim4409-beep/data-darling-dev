

## Fix Panel Stats and Enable Category-less Stories

### Step A: Enable Category-less 24h Stories (`StoryUploadModal.tsx`)

1. Add a "Kategorisiz" option (id `"none"`, icon `Clock`) as the first item in the categories array
2. Update `handleUpload` (line 83): remove `!selectedCategory` guard — only require `selectedFile` and `user`. When `selectedCategory` is empty or `"none"`, pass `category: undefined` to `createStory`
3. Update the category preview section (line 236): when `selectedCategory` is `"none"` or empty, show "Normal 24 saatlik hikaye olarak paylaşılacak"
4. Update the disabled check on the submit button (line 273): remove `!selectedCategory`
5. Default `selectedCategory` to `"none"` instead of `""`

### Step B: Live Follower Count (`useSocialMutations.ts` + `ProfileContext.tsx`)

1. Add `useMyFollowerCount()` hook in `useSocialMutations.ts`:
   - Queries `user_follows` table with `select("id", { count: "exact", head: true })` filtered by `followed_id = user.id`
   - Query key: `["my-follower-count", user?.id]`

2. Update `ProfileContext.tsx`:
   - Import and call `useMyFollowerCount()`
   - Sync the returned count into `profile.followers` so `MobileProfilePreview` and `ProfileSettings` automatically reflect live data

### Files

| File | Action |
|------|--------|
| `src/components/content-studio/StoryUploadModal.tsx` | MODIFY — add "Kategorisiz" option, relax validation |
| `src/hooks/useSocialMutations.ts` | MODIFY — add `useMyFollowerCount` hook |
| `src/contexts/ProfileContext.tsx` | MODIFY — wire live follower count |




## Build Active Stories and View Analytics (Epic 5 - Part 2)

### Problem
Coaches have no way to see their currently active (non-expired) stories separately, nor can they see who viewed each story.

### Plan

#### 1. Analytics Hook (`src/hooks/useSocialMutations.ts`)
Add `useStoryAnalytics(storyId: string | undefined)`:
- Query `story_views` table where `story_id = storyId`
- Since `story_views` is not yet in the generated Supabase types, use `.from("story_views" as any)` to bypass type checking
- Select with a join: `select('id, viewed_at, viewer_id, profiles!viewer_id(full_name, avatar_url)')`
- Order by `viewed_at` descending
- Enabled only when `storyId` is truthy

#### 2. Active Stories Dialog (`src/components/content-studio/ActiveStoriesDialog.tsx`)
New component modeled after `StoryArchiveDialog.tsx`:
- Reuse `useCoachStoryArchive` but filter to only show stories where `expires_at > now()`
- Grid of story thumbnails (same 9:16 aspect ratio cards)
- Each card shows a green "Aktif" badge and time remaining
- Clicking a card opens a full-screen viewer dialog
- In the viewer, show an "Eye [count] Goruntuleme" button at the bottom
- Clicking it toggles a viewers panel that uses `useStoryAnalytics(viewingStory.id)`
- Viewers panel lists: avatar, full name, relative time ("2 saat once") using `formatDistanceToNow`
- Empty state: "Henuz goruntuleme yok"

#### 3. Wire into HighlightsSection (`src/components/content-studio/HighlightsSection.tsx`)
- Add state: `isActiveStoriesOpen`
- Add an "Aktif Hikayeler" button (with `Radio` or `Eye` icon) next to the existing "Arsiv" button
- Import and render `ActiveStoriesDialog`

### Files

| File | Action |
|------|--------|
| `src/hooks/useSocialMutations.ts` | MODIFY — add `useStoryAnalytics` hook |
| `src/components/content-studio/ActiveStoriesDialog.tsx` | NEW — active stories grid + viewer with analytics |
| `src/components/content-studio/HighlightsSection.tsx` | MODIFY — add button + dialog state |

### Technical Notes
- The `story_views` table exists in the database but is not yet in the auto-generated types file. We will cast the table name to bypass TypeScript until types regenerate.
- The join `profiles!viewer_id(full_name, avatar_url)` works because `viewer_id` references `auth.users`, and the `profiles` table has `id` matching `auth.users.id`. If the foreign key is not directly on `story_views.viewer_id -> profiles.id`, we will fall back to a separate query for viewer profiles.


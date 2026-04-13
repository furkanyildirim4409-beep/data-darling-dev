

## Build Story Archive in Coach Panel

### Problem
Coaches cannot view expired stories. The current `coach_stories` SELECT RLS policy only allows viewing stories where `now() < expires_at`, blocking archive access.

### Plan

#### 1. Database Migration — New RLS Policy
Add a SELECT policy so coaches can see ALL their own stories (active + expired):

```sql
CREATE POLICY "Coaches can view own stories"
ON public.coach_stories
FOR SELECT
TO authenticated
USING (coach_id = auth.uid());
```

This works alongside the existing public policy (which only shows active stories to athletes).

#### 2. Add `useCoachStoryArchive` Hook (`src/hooks/useSocialMutations.ts`)
- New `useQuery` hook fetching ALL `coach_stories` where `coach_id = user.id`, ordered by `created_at desc`
- Query key: `["coach-stories-archive", user?.id]`
- No `expires_at` filter

#### 3. Create `StoryArchiveDialog` Component (`src/components/content-studio/StoryArchiveDialog.tsx`)
- A Dialog triggered by an "Arşiv" button in the HighlightsSection header
- Displays a responsive grid of story thumbnails (3-4 columns)
- Each thumbnail shows:
  - The media (image via `media_url`)
  - Formatted date (`created_at`)
  - Badge: green "Aktif" if `expires_at > now`, gray "Arşiv" if expired
  - Category label if present
- Loading skeleton and empty state ("Henuz hikaye yok")
- Clicking a thumbnail opens a nested viewer dialog showing the full image/video

#### 4. Wire Into HighlightsSection (`src/components/content-studio/HighlightsSection.tsx`)
- Add an "Arşiv" button next to existing header buttons
- Import and render `StoryArchiveDialog` with open/close state

### Files
| File | Action |
|------|--------|
| Migration SQL | NEW — add coach self-select policy |
| `src/hooks/useSocialMutations.ts` | MODIFY — add `useCoachStoryArchive` |
| `src/components/content-studio/StoryArchiveDialog.tsx` | NEW — archive grid + viewer |
| `src/components/content-studio/HighlightsSection.tsx` | MODIFY — add archive button |


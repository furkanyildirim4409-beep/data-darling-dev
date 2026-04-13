

## Enable Highlight Management from Story Archive

### Overview
Add the ability for coaches to assign or remove highlight categories on archived stories, directly from the full-screen viewer in `StoryArchiveDialog`.

### Plan

#### 1. Add `useUpdateStoryCategory` mutation (`src/hooks/useSocialMutations.ts`)
- New mutation accepting `{ storyId: string, category: string | null }`
- Updates `coach_stories.category` where `id = storyId` and `coach_id = user.id`
- On success: invalidate `["coach-stories-archive"]` and `["coach-stories"]`, show toast

#### 2. Upgrade viewer state in `StoryArchiveDialog.tsx`
- Replace `viewingUrl: string | null` with `viewingStory: StoryObject | null` (the full story row)
- Update grid `onClick` to pass the entire story object
- Update viewer dialog's `open` check and media rendering to use `viewingStory.media_url`

#### 3. Add category assignment UI in the viewer overlay
- Import the highlight `categories` array from `StoryUploadModal.tsx` (extract to shared constant or import directly)
- Below the media in the viewer dialog, render a bottom overlay bar with:
  - A `Select` dropdown listing the 5 highlight categories + a "Kategoriden Cikar" option (maps to `null`)
  - Pre-select current `viewingStory.category`
  - On change, fire `useUpdateStoryCategory` mutation
  - Show toast: "Hikaye one cikanlara eklendi!" or "Kategori kaldirildi"
- Update local `viewingStory` state for instant feedback

#### 4. Extract shared categories constant
- Move the `categories` array from `StoryUploadModal.tsx` into a shared file (e.g., `src/data/storyCategories.ts`) so both `StoryUploadModal` and `StoryArchiveDialog` import from the same source

### Files

| File | Action |
|------|--------|
| `src/data/storyCategories.ts` | NEW — shared categories array |
| `src/hooks/useSocialMutations.ts` | MODIFY — add `useUpdateStoryCategory` |
| `src/components/content-studio/StoryArchiveDialog.tsx` | MODIFY — upgrade state, add category UI |
| `src/components/content-studio/StoryUploadModal.tsx` | MODIFY — import categories from shared file |


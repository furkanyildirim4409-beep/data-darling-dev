

# Fix: RapidAPI Limit, Auto-Seeding, and video_url Bugs

## Root Causes

### Bug 1: RapidAPI always returns 10 exercises
The fetch URL and limit parameter look correct in the code. However, **Supabase's default query limit is 1000 rows** on the `fetchExercises` call. If the table has >1000 exercises, the duplicate check in `handleImport` uses an incomplete `exercises` prop — but more critically, the ExerciseDB free tier may cap at 10. The real fix: the API call itself is fine, but we should log `data.length` to confirm the API response size. Additionally, we should remove the Supabase 1000-row cap.

### Bug 2: Deleted exercises reappear (auto-seeding)
`ProgramLibrary.tsx` lines 190-213: when `fetchExercises` returns 0 rows, it seeds 20 default exercises. So if you delete all exercises from the DB, the app immediately re-inserts defaults. **Fix: Remove the auto-seeding logic entirely**, or gate it behind a flag.

### Bug 3: video_url not working
The mapping chain is: `exercise_library.video_url` → `LibraryItem.gifUrl` → `BuilderExercise.videoUrl` → `exercises.video_url`. This chain exists in the code. The issue is likely that **the exercise_library table has no video_url data** for the default seeded exercises (they were inserted without video_url). The RapidAPI imported exercises should have video_url if the API returns `gifUrl`. Need to verify the display side too — check if `WorkoutBuilder`/`SortableExerciseItem` actually renders the videoUrl.

## Changes

### 1. `ProgramLibrary.tsx` — Fix Supabase 1000-row limit + remove auto-seeding

- Add `.limit(5000)` to the `fetchExercises` query to handle large libraries
- **Remove the auto-seeding block** (lines 190-213) — if the table is empty, just show empty state. The coach can use the editor to add exercises or import from RapidAPI.

### 2. `ExerciseLibraryEditor.tsx` — Fix RapidAPI duplicate check with full DB data

- Before filtering duplicates, fetch exercise names directly from Supabase (not relying on the `exercises` prop which may be capped at 1000). Use a dedicated query: `select('name').limit(10000)`.
- Add `console.log` of API response length for debugging.

### 3. `SortableExerciseItem.tsx` — Verify video_url rendering

- Check if the component displays the GIF. If not, add a small thumbnail next to the exercise name using `videoUrl`.

## Files
- **Edit** `src/components/program-architect/ProgramLibrary.tsx`
- **Edit** `src/components/program-architect/ExerciseLibraryEditor.tsx`  
- **Edit** `src/components/program-architect/SortableExerciseItem.tsx` (if video display is missing)


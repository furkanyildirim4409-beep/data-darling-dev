

# Map Library GIF URL to Database `video_url`

## Overview
The `gifUrl` from `LibraryItem` is lost at three points: when adding to builder, when saving to DB, and when loading from DB. Fix all three.

## Changes

### 1. `BuilderExercise` interface (`WorkoutBuilder.tsx`, line 61)
Add `videoUrl?: string` field.

### 2. `handleAddItem` (`Programs.tsx`, line 143)
Pass `gifUrl` through: `videoUrl: item.gifUrl || undefined` in the `BuilderExercise` spread.

### 3. Save payload (`Programs.tsx`, line 404-415)
Add `video_url: ex.videoUrl || null` to the exercise row object.

### 4. Load from DB (`Programs.tsx`, line 85-97)
Add `videoUrl: (ex as any).video_url || undefined` to the mapped `BuilderExercise`.

### 5. `AssignProgramDialog.tsx` (exercisesJson mapping, ~line 145)
Already has access to `ex.video_url` from the DB query. Ensure it's included: `video_url: ex.video_url ?? null`.

### 6. Template save/load (if present)
Include `videoUrl` in template serialization/deserialization.

## Files
- **Edit** `src/components/program-architect/WorkoutBuilder.tsx`
- **Edit** `src/pages/Programs.tsx`
- **Edit** `src/components/program-architect/AssignProgramDialog.tsx`


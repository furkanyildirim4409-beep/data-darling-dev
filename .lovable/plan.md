

# Fix: RapidAPI Limit & Verify video_url Pipeline

## Analysis

After tracing the complete data pipeline, here are the findings:

### Bug 1: RapidAPI returns only 10 exercises
**Root cause confirmed**: The `&offset=0` parameter was removed in the previous fix. ExerciseDB API defaults to returning only 10 results when `offset` is omitted, regardless of the `limit` value.

**Fix**: Add `&offset=0` back to the fetch URL in `ExerciseLibraryEditor.tsx` line 125.

### Bug 2: video_url Pipeline — Actually Intact
After a full audit of every hop in the chain, the mapping is **correctly wired**:

```text
exercise_library.video_url
  → LibraryItem.gifUrl        (ProgramLibrary.tsx:189)
  → BuilderExercise.videoUrl   (Programs.tsx:144, drag-drop handler)
  → exercises.video_url        (Programs.tsx:416, save to DB)
  → assigned_workouts.exercises[].video_url  (AssignProgramDialog.tsx:202)
```

The load path (editing existing programs) also correctly maps `video_url` → `videoUrl` (Programs.tsx:97).

**Why video_url is null**: The existing 10 exercises in `exercise_library` were either manually seeded or imported before the `gifUrl` mapping existed — they simply have no `video_url` data. A fresh RapidAPI import (with the offset fix) will populate `video_url` from ExerciseDB's `gifUrl` field.

## Changes

### `ExerciseLibraryEditor.tsx` — Single line change

Line 125: Add `&offset=0` back to the fetch URL:
```
- `https://exercisedb.p.rapidapi.com/exercises?limit=${clampedLimit}`
+ `https://exercisedb.p.rapidapi.com/exercises?limit=${clampedLimit}&offset=0`
```

No other files need changes — the video_url pipeline is already correct.


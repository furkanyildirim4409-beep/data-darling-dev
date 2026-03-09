

# RapidAPI ExerciseDB Bulk Importer

## Overview
Add an import button and modal inside the `ExerciseLibraryEditor` that fetches exercises from the ExerciseDB API and merges them into the coach's localStorage-based exercise library. Since the Supabase `exercises` table is program-specific (requires `program_id`, `sets`, `reps`), the import targets the local `LibraryItem[]` catalog which is the actual exercise selection pool.

## Changes

### 1. `ExerciseLibraryEditor.tsx` — Add Import Button + Modal

**New state variables:** `importOpen`, `apiKey`, `importLimit`, `importing`, `importResult`.

**UI additions (bottom of the editor, before the "Toplam" footer):**
- A secondary button: `🚀 RapidAPI'den Egzersiz Çek`
- Clicking opens a nested Dialog with:
  - Password input for `x-rapidapi-key`
  - Number input for limit (default 50, max 1300)
  - "Verileri Çek ve Kaydet" button
  - Loading spinner + result message area

**Fetch logic:**
```
GET https://exercisedb.p.rapidapi.com/exercises?limit={limit}&offset=0
Headers: x-rapidapi-key, x-rapidapi-host
```

**Transform:** Map each ExerciseDB item to `LibraryItem`:
- `id` → `"exdb-{ex.id}"`
- `name` → `ex.name`
- `category` → `ex.bodyPart` (capitalize)
- `type` → `"exercise"`
- `muscleGroup` → `ex.target`
- `gifUrl` → `ex.gifUrl`

**Merge logic:** Filter out duplicates by checking existing exercise names (case-insensitive), then append new items via `onExercisesChange([...exercises, ...newItems])`.

**Result feedback:** Toast with count of imported exercises. Show error toast if API call fails.

### 2. No database migration needed
The exercise catalog lives in localStorage. The Supabase `exercises` table is for program-bound exercise rows and has a different schema.

## Files
- **Edit** `src/components/program-architect/ExerciseLibraryEditor.tsx`


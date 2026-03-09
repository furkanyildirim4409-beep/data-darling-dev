

# Exercise Library GIF Integration

## Overview
Add `gifUrl` field to the exercise library so coaches can attach instructional GIF URLs to exercises, with live preview and list thumbnails.

## Changes

### 1. `LibraryItem` interface (`ProgramLibrary.tsx`, line 58-65)
Add `gifUrl?: string` to the interface.

### 2. `ExerciseLibraryEditor.tsx` — Add GIF fields to forms

**State additions:** `editGifUrl`, `newGifUrl` state variables.

**Add form (line 116-147):**
- Insert a GIF URL input after the category/muscle selects: placeholder "Örn: https://example.com/bench-press.gif"
- Below it, render a live preview if URL is non-empty: a small centered `<img>` with `w-24 h-24 object-cover rounded-lg` inside a bordered container, with `onError` fallback.

**Edit form (line 162-196):**
- Add the same GIF URL input + preview below the category/muscle selects.
- Wire `editGifUrl` into `startEdit` and `saveEdit`.

**List view (line 198-228):**
- Before the exercise name, if `ex.gifUrl` exists, render a tiny `w-8 h-8 rounded` thumbnail image. If no GIF, show a small `Image` icon placeholder from lucide-react (muted).

### 3. Save logic updates
- `handleAdd`: include `gifUrl: newGifUrl || undefined`
- `saveEdit`: include `gifUrl: editGifUrl || undefined`
- Reset `newGifUrl` after add.

### 4. `LibraryItemCard` in `ProgramLibrary.tsx` (line 85-136)
- If `item.gifUrl` exists, show a tiny `w-7 h-7 rounded` thumbnail before the name, replacing the Dumbbell icon area.

### 5. No database migration needed
The exercise library is localStorage-based. The `gifUrl` persists via the existing `coach-exercise-library` localStorage key.

## Files
- **Edit** `src/components/program-architect/ProgramLibrary.tsx` (interface + LibraryItemCard)
- **Edit** `src/components/program-architect/ExerciseLibraryEditor.tsx` (forms + list + preview)


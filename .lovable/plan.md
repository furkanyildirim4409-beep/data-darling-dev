

# Fix: Align WorkoutHistoryTab with Actual DB JSON

## Problem
The actual DB payload uses `exerciseName` (not `name`) and stores performed sets directly in `sets` as an array (not `actualSets`). This causes blank exercise details.

## Changes — `src/components/athlete-detail/WorkoutHistoryTab.tsx`

### 1. Update `ExerciseDetail` interface
Add `exerciseName?: string`, `targetSets?: number`, `targetReps?: string | number`, and change `sets` to `sets?: number | PerformedSet[]` to handle both shapes.

### 2. Update `getPerformedSets`
Check if `ex.sets` is an array first — if so, use it. Otherwise fall back to existing keys.

### 3. Fix exercise name rendering
Use `ex.name || ex.exerciseName || "Bilinmeyen Egzersiz"` everywhere the name is displayed.

### 4. Fix target display logic
Since `sets` can now be an array, derive target from `targetSets`/`targetReps` or only use `sets`/`reps` when `sets` is a number:
```
const targetSets = typeof ex.targetSets === 'number' ? ex.targetSets : (typeof ex.sets === 'number' ? ex.sets : null);
const targetReps = ex.targetReps || ex.reps;
```

### 5. Keep all hypertrophy logic intact
RIR, failure_set, groupId, superset rendering — unchanged.

## Files
- **Edit** `src/components/athlete-detail/WorkoutHistoryTab.tsx`


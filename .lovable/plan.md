

# Per-Set RIR Input in Program Builder

## Overview
Replace the single RIR input with a dynamic array of small inputs — one per set — so coaches can assign different RIR targets per set (e.g., `[3, 2, 0]`).

## Changes

### 1. `BuilderExercise` interface (`WorkoutBuilder.tsx`, line 61)
Add `rirPerSet?: number[]` to the interface.

### 2. `onUpdateExercise` signature (`WorkoutBuilder.tsx`, line 158 + `Programs.tsx` line 174)
Widen the value type from `number | string` to `number | string | number[]` so `rirPerSet` arrays can be passed through.

### 3. `SortableExerciseItem.tsx` — Replace single RIR input (lines 131-140)
- Remove the single RIR `<Input>`.
- Render a flex row of `exercise.sets` small inputs, each labeled `S1`, `S2`, etc.
- Each input reads from `exercise.rirPerSet?.[i] ?? exercise.rir ?? 2`.
- On change, build a new array and call `onUpdateExercise` with field `"rirPerSet"` and the array value. Also update the single `rir` field to `newArray[0]` for backward compatibility.
- When `exercise.failureSet` is active, visually dim/disable these inputs and show the last input as "F".
- Update the `onUpdateExercise` prop type to accept `number | string | number[]`.
- Adjust the grid from `grid-cols-4` to `grid-cols-3` (Set, Tekrar, RPE), then render the RIR per-set row below as a separate section.

### 4. Save payload (`Programs.tsx`, line 401-413)
Add `rir_per_set: ex.rirPerSet || null` to the exercise row object in `handleSaveProgram`.

### 5. Load from DB (`Programs.tsx`, line 82-98, `handleEditProgram`)
When mapping exercises back to `BuilderExercise`, read `(ex as any).rir_per_set` and set `rirPerSet`.

### 6. Template save/load (`Programs.tsx`, lines 295-307, 438-468)
Include `rirPerSet` in template serialization and deserialization.

### 7. `AssignProgramDialog.tsx` (line ~145)
Add `rir_per_set: ex.rir_per_set ?? null` to the `exercisesJson` mapping.

## Files
- **Edit** `src/components/program-architect/WorkoutBuilder.tsx`
- **Edit** `src/components/program-architect/SortableExerciseItem.tsx`
- **Edit** `src/pages/Programs.tsx`
- **Edit** `src/components/program-architect/AssignProgramDialog.tsx`


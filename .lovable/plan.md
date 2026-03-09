
# Analysis: Assignment Dialog Already Implements Index-Based Matching ✓

After reviewing `src/components/program-architect/AssignProgramDialog.tsx`, the code **already implements the exact index-based matching logic** requested.

## Current Implementation (Lines 180-200)

```typescript
// Sort exercises first to establish stable indices
const sortedExercises = (exs ?? []).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

const exercisesJson = sortedExercises.map((ex, exIdx) => {
  // Find if this exercise index belongs to any group
  const foundGroup = dayGroups.find(g => 
    g.exerciseIndices && g.exerciseIndices.includes(exIdx)
  );
  
  return {
    name: ex.name,
    sets: ex.sets ?? 3,
    reps: ex.reps ?? "10",
    rir: ex.rir ?? 2,
    failure_set: ex.failure_set ?? false,
    rest_time: ex.rest_time ?? "",
    notes: ex.notes ?? "",
    order_index: (ex.order_index ?? 0) % 100,
    groupId: foundGroup?.id ?? null,
  };
});
```

## Verification Checklist ✓

- ✅ Exercises sorted by `order_index` before mapping (line 181)
- ✅ `.map((ex, exIdx) => ...)` includes index parameter (line 183)
- ✅ `foundGroup` uses `exerciseIndices.includes(exIdx)` (lines 185-187)
- ✅ `groupId` set to `foundGroup?.id ?? null` (line 198)
- ✅ All other exercise fields preserved unchanged (lines 190-197)

## Conclusion

**The assignment dialog is correctly implemented.** The index-based matching logic is already in place and matches the requirements exactly. The superset ID mismatch should be resolved with the recent changes to `Programs.tsx` (which now saves both `exerciseIds` and `exerciseIndices`).

**No code changes required** — the system should work as designed. Recommend end-to-end testing to verify the complete flow.

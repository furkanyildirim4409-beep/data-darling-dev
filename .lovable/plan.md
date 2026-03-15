

## `rir_per_set` Synchronization Bug — Part 2 of 2

### Discovery

The existing code **already handles the fallback correctly** on both fronts:

**Line 162 — Display fallback:**
```typescript
const val = exercise.rirPerSet?.[i] ?? exercise.rir ?? 2;
```
The `?.` optional chaining on `rirPerSet` already returns `undefined` when the array is `null`, causing the `??` to fall back to `exercise.rir`. This is exactly the desired behavior.

**Line 177 — Edit reconstruction:**
```typescript
const newArray = [...(exercise.rirPerSet || Array(exercise.sets).fill(exercise.rir ?? 2))];
```
When `rirPerSet` is `null`/`undefined`, it reconstructs the full array using `exercise.rir` as the fill value for all untouched sets, then applies the edited value at index `i`.

### Conclusion

**No code changes are required.** The `SortableExerciseItem.tsx` component already gracefully handles `null` `rirPerSet` by:
1. Falling back to `exercise.rir` (then `2`) for display
2. Reconstructing the array from `exercise.rir` when a coach edits any individual set

The Part 1 engine fix (nullifying `rir_per_set` on mutation) will flow cleanly through the existing UI logic without any visual or data inconsistencies.


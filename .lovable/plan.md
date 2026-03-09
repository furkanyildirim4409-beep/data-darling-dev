

# Fix: Restore `exerciseIds` for Frontend Builder

## Problem
The recent update to save `exerciseIndices` accidentally removed `exerciseIds` from `week_config.groups`. The WorkoutBuilder needs `exerciseIds` to display groups when editing an existing program.

## Solution

### 1. Update Save Logic (lines 233-239)
Save BOTH `exerciseIds` (for reference) and `exerciseIndices` (for assignment stability):

```typescript
const mappedGroups = rawGroups.map(g => ({
  id: g.id,
  type: g.type,
  exerciseIds: g.exerciseIds, // RESTORED
  exerciseIndices: g.exerciseIds
    .map(id => dayExercises.findIndex(e => e.id === id))
    .filter(idx => idx !== -1)
}));
```

### 2. Update Load Logic (lines 84-91)
When loading a program, exercises get NEW UUIDs from the database. Reconstruct `exerciseIds` using saved `exerciseIndices` mapped to freshly loaded exercises:

```typescript
// After exercises are populated into newWeek...
weekConfig.forEach((cfg: any, i: number) => {
  if (i < 7) {
    newWeek[i].label = cfg.label || "";
    newWeek[i].notes = cfg.notes || "";
    newWeek[i].blockType = cfg.blockType || "none";
    
    if (cfg.groups?.length) {
      loadedGroups[i] = cfg.groups.map((g: any) => {
        // Reconstruct exerciseIds from exerciseIndices using new DB UUIDs
        const reconstructedIds = g.exerciseIndices && newWeek[i].exercises.length
          ? g.exerciseIndices
              .map((idx: number) => newWeek[i].exercises[idx]?.id)
              .filter(Boolean)
          : g.exerciseIds || [];
        
        return { ...g, exerciseIds: reconstructedIds };
      });
    }
  }
});
```

**Key change**: Move `loadedGroups` population to AFTER exercises are loaded into `newWeek`, so we can use fresh UUIDs.

## Files Changed
- `src/pages/Programs.tsx` — save logic (add `exerciseIds`) + load logic (reconstruct IDs after exercises load)


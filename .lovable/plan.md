

# Coach Analytics: Global PR & Exercise Progression

## Current State
Volume progression (Part 1) is **already implemented** — `calcTonnageRaw`, `buildVolumeMap`, and the session-level badges (↑ +%X Hacim, ↓ -%X Hacim, İlk Kayıt) are all in place.

What's missing is Part 2: **exercise-level progression badges** when the coach expands a session.

## Changes — Single file: `WorkoutHistoryTab.tsx`

### 1. Add `buildExerciseProgressionMap` helper
Iterate through all loaded logs chronologically. For each exercise (by normalized name), track:
- `globalMaxWeight`: the absolute highest weight ever lifted across all sessions
- `previousMaxWeight`: the max weight from the chronologically previous session containing that exercise

Returns a map keyed by `logId:exerciseName` with:
- `isGlobalPR: boolean` — true if this session's max weight equals the global max AND is strictly greater than any previous occurrence
- `weightDiffFromPrev: number | null` — difference from previous session's max weight for that exercise

```typescript
function buildExerciseProgressionMap(logs: WorkoutLog[]) {
  const sorted = [...logs].sort((a, b) => 
    new Date(a.logged_at || 0).getTime() - new Date(b.logged_at || 0).getTime()
  );
  
  // Track per-exercise: previous max weight and global max weight
  const prevMaxByExercise: Record<string, number> = {};
  const result: Record<string, { isGlobalPR: boolean; weightDiff: number | null }> = {};

  for (const log of sorted) {
    for (const ex of log.details ?? []) {
      const name = (ex.name || ex.exerciseName || "").toLowerCase().trim();
      if (!name) continue;
      const sets = getPerformedSetsStatic(ex);
      const maxWeight = Math.max(0, ...sets.map(s => s.weight || 0));
      if (maxWeight === 0) continue;

      const prev = prevMaxByExercise[name];
      const key = `${log.id}:${name}`;

      if (prev == null) {
        result[key] = { isGlobalPR: true, weightDiff: null }; // first ever
      } else {
        const diff = maxWeight - prev;
        result[key] = {
          isGlobalPR: maxWeight > prev,
          weightDiff: diff !== 0 ? diff : null,
        };
      }
      // Update tracking: always keep the highest seen so far for PR detection
      prevMaxByExercise[name] = Math.max(prev ?? 0, maxWeight);
    }
  }
  return result;
}
```

### 2. Wire into component with `useMemo`
```typescript
const exerciseMap = useMemo(() => buildExerciseProgressionMap(logs), [logs]);
```

### 3. Render badges in exercise rows
Inside the exercise detail render (after existing badges like Tükeniş, RIR), look up progression data and render:

- **Global PR**: `🏆 YENİ REKOR` — gold/amber badge
- **Weight increase (not PR)**: `+Xkg` — green badge  
- **Weight decrease**: `-Xkg` — orange badge (already partially handled by `ex.weightDiff` but this adds computed values)

### 4. Add Trophy icon import
Add `Trophy` from lucide-react for the PR badge.

### Technical Notes
- Progression is computed from loaded logs only (same pragmatic approach as volume map)
- Exercise name matching is case-insensitive and trimmed
- Max weight per exercise is tracked (not per-set), matching standard PR logic
- No database changes needed


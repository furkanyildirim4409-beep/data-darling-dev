

# Display Progressive Overload & RIR Success Badges

## Changes — `src/components/athlete-detail/WorkoutHistoryTab.tsx`

### 1. Add fields to `ExerciseDetail` interface (line 38)
Add `weightDiff?: number | null` and `rirSuccess?: boolean | null`.

### 2. Add `TrendingUp`, `TrendingDown`, `AlertTriangle` icons to imports (line 10)
From `lucide-react`.

### 3. Insert progressive overload badge in exercise name area (after line 335, inside the name/badges flex container)
- If `ex.weightDiff` is a non-zero number:
  - Positive → green badge: `+Xkg Gelişim` with `TrendingUp` icon
  - Negative → orange badge: `Xkg Düşüş` with `TrendingDown` icon

### 4. Insert RIR miss warning after the performed sets row (after line 373)
- If `ex.rir != null` AND `ex.rirSuccess === false` → render a small destructive text: `⚠️ RIR Hedefi Kaçırıldı`

### 5. No other changes
All existing fallback logic, date filtering, pagination remain untouched.

## Files
- **Edit** `src/components/athlete-detail/WorkoutHistoryTab.tsx`


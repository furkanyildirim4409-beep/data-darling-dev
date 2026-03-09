

# Enhance Completed Workout History View for Coach

## Problem
The coach dashboard has no way to view detailed workout logs from athletes. Currently only aggregate stats (total count, tonnage) are shown. The `workout_logs` table has a `details` JSONB column with exercise-level data including RIR, failure sets, and groupId — none of which are displayed.

## Solution

### 1. Create `src/components/athlete-detail/WorkoutHistoryTab.tsx`
New component that fetches and displays completed workout logs with full hypertrophy detail.

**Data fetching:**
- Query `workout_logs` where `user_id = athleteId`, ordered by `logged_at` desc
- Select: `id, workout_name, logged_at, duration_minutes, tonnage, exercises_count, details, completed`

**Exercise rendering with hypertrophy badges:**
- Parse `details` JSONB (expected structure: array of exercises with `name, sets, reps, rir, failure_set/failureSet, groupId, actualSets[]`)
- **Failure badge**: If `failure_set === true || failureSet === true` → render orange/red `🔥 Tükeniş` badge
- **RIR badge**: If `rir` exists → render `🎯 RIR: {rir}` badge, with red styling when RIR === 0
- **Superset grouping**: Group exercises sharing the same `groupId` with a colored left border and `🔗 Süperset` label
- **Target vs Actual**: Show target (e.g., "3×10") alongside actual logged sets if `actualSets` array exists in details

**Visual design:**
- Each workout log is a collapsible card showing date, duration, tonnage, exercise count in the header
- Expanded view shows exercises with all badges
- Failure sets with fewer reps than target get a neutral/positive styling (not red) since hitting failure was the goal
- Empty state when no logs exist

### 2. Update `src/pages/AthleteDetail.tsx`
- Import `WorkoutHistoryTab`
- Add a 4th tab: `📊 Antrenman Geçmişi` (Workout History)
- Wire it with `athleteId`

### 3. No database changes needed
The `workout_logs` table already has the `details` JSONB column with all needed data.

## Files Changed
- **Create** `src/components/athlete-detail/WorkoutHistoryTab.tsx` — full workout history with hypertrophy badges and superset grouping
- **Edit** `src/pages/AthleteDetail.tsx` — add History tab


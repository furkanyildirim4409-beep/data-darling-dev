

# Day-of-Week Logic for Recurring Programs

## Overview
Replace calendar-date-based assignment with day-of-week mapping. The `assigned_workouts` table gets a `day_of_week` column, and all assignment/display logic switches from `scheduled_date` to `day_of_week`.

## Database Migration
```sql
ALTER TABLE public.assigned_workouts ADD COLUMN day_of_week text;
```

## File Changes

### 1. `AssignProgramDialog.tsx`
- Remove `scheduledDate` state, `addDays` helper, and the date `<Input type="date">` element
- Map each active day (dayIdx 0-6) to a Turkish day name: `["Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi","Pazar"]`
- In the preview badges, show day-of-week names instead of calculated dates
- In `handleAssign` payload, replace `scheduled_date: targetDate` with `day_of_week: DAY_NAMES[dayIdx]` and set `scheduled_date: null`

### 2. `BulkAssignDialog.tsx`
- Same changes: remove `scheduledDate` state, date picker UI, and `addDays` helper
- In payload construction, use `day_of_week: DAY_NAMES[dayIdx]` instead of `scheduled_date: addDays(...)`

### 3. `ProgramTab.tsx`
- Update `AssignedWorkout` interface to include `day_of_week: string | null`
- Fetch `day_of_week` in the select query
- Sort workouts by day-of-week order (Pazartesi=0 through Pazar=6) instead of `scheduled_date`
- Display `workout.day_of_week` as the subtitle instead of formatting `scheduled_date`

### Day Name Constant (shared across files)
```typescript
const DAY_NAMES = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
```

### Technical Notes
- `scheduled_date` column is kept nullable and set to `null` for new recurring assignments — no destructive schema change needed
- Existing `assigned_workouts` with `scheduled_date` will still render (fallback display)
- RLS policies are unaffected since no new access patterns are introduced


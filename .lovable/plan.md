

# Program Library & Assignment System

## Overview
Pivot the Programs page to use `workout_templates` (with `routine_days` JSONB) as the primary program system. Build an intuitive multi-day program builder and 1-click athlete assignment that auto-generates `assigned_workouts` rows.

## JSONB Structure for `routine_days`
```text
[
  {
    "day": 1,
    "label": "Push Day",
    "exercises": [
      { "name": "Bench Press", "sets": 4, "reps": "8-10", "rest": 90 },
      { "name": "Overhead Press", "sets": 3, "reps": "10", "rest": 60 }
    ]
  },
  { "day": 2, "label": "Dinlenme", "exercises": [] },
  ...
]
```

## Changes

### 1. New Component: `src/components/program-architect/TemplateDashboard.tsx`
- Replaces the current `ProgramDashboard` as the default view on Programs page
- Fetches from `workout_templates` where `coach_id = auth.uid()`
- Grid of template cards showing name, description, day count, exercise count
- Each card has: Edit, Assign, Duplicate, Delete actions via dropdown menu
- "Yeni Program Oluştur" button opens the builder

### 2. New Component: `src/components/program-architect/RoutineBuilder.tsx`
- 7 collapsible day cards (Day 1–7), each with a label input ("Push Day", "Rest", etc.)
- Each day card has an exercise list with add/remove. Exercise fields: `name`, `sets`, `reps`, `rest`
- Use the existing exercise library (`ProgramLibrary`) in a side panel — drag or click to add exercises to the currently selected day
- Top-level inputs: Program Name + Description
- Save button → `INSERT INTO workout_templates` with `routine_days` JSONB
- Edit mode: pre-populate from existing template

### 3. New Component: `src/components/program-architect/AssignTemplateDialog.tsx`
- Dialog with athlete multi-select (from `useAthletes` hook) and start date picker
- **The Magic**: On assign, loop through `routine_days`:
  - For each day with exercises, calculate `scheduled_date = startDate + (day - 1) days`
  - `INSERT` into `assigned_workouts` with `coach_id`, `athlete_id`, `scheduled_date`, `workout_name` (day label), `exercises` (day's exercises JSONB)
- Batch insert all rows in one call
- Toast success: "Program X sporcu(ya) atandı!"

### 4. Modify `src/pages/Programs.tsx`
- Replace the current dashboard/builder toggle with `TemplateDashboard` (default) vs `RoutineBuilder` (when creating/editing)
- Remove the old `ProgramDashboard`, `WorkoutBuilder`, `WeeklySchedule`, `NutritionBuilder` imports (keep files intact, just don't use them here)
- Wire up create → opens RoutineBuilder, edit → opens RoutineBuilder with data, assign → opens AssignTemplateDialog

### 5. No DB changes needed
`workout_templates` table already has the correct schema. `assigned_workouts` already supports `workout_name` and `exercises` JSONB. RLS policies are in place for both tables.

## File Summary

| Action | File |
|--------|------|
| Create | `src/components/program-architect/TemplateDashboard.tsx` |
| Create | `src/components/program-architect/RoutineBuilder.tsx` |
| Create | `src/components/program-architect/AssignTemplateDialog.tsx` |
| Modify | `src/pages/Programs.tsx` — rewire to new components |


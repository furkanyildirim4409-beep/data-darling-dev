

# Connect Workout Builder to Supabase

## Problem
The Program Dashboard and Save flow use mock data and local state. Programs/exercises aren't persisted to the database.

## Changes

### 1. Add RLS policies for `programs` and `exercises` tables
Both tables currently have **no RLS policies**. Need to add:
- `programs`: coaches can CRUD their own programs (`coach_id = auth.uid()`)
- `exercises`: coaches can CRUD exercises belonging to their programs (via join to `programs.coach_id`)

### 2. Rewrite `SaveTemplateDialog.tsx` → Save to Supabase
Expand the dialog to also collect `description`, `difficulty`, `target_goal` fields. On save:
- **Step A**: `INSERT` into `programs` table with `title`, `description`, `difficulty`, `target_goal`, `coach_id`
- **Step B**: Get returned `program_id`
- **Step C**: Bulk `INSERT` exercises into `exercises` table with `program_id`, `name`, `sets`, `reps`, `rest_time`, `notes`, `order_index`
- Show toast on success, clear builder state, switch back to dashboard

The `onSave` callback in `Programs.tsx` will be updated to pass exercises + auth user down.

### 3. Rewrite `ProgramDashboard.tsx` → Fetch from Supabase
- Remove `mockExercisePrograms` and `mockNutritionPrograms`
- Fetch programs from `programs` table where `coach_id = user.id`
- Map to `ProgramData` interface
- Delete also calls `supabase.from('programs').delete()`
- Duplicate inserts a new row via Supabase

### 4. Update `Programs.tsx` orchestration
- Pass `user` from `useAuth()` context to save handler
- Update `handleSaveTemplate` to perform the Supabase insert (program + exercises)
- On success: clear state, switch to dashboard view

### File Changes
- `supabase/migrations/` — new migration for RLS on `programs` and `exercises`
- `src/components/program-architect/ProgramDashboard.tsx` — remove mocks, fetch from Supabase
- `src/components/program-architect/SaveTemplateDialog.tsx` — add description/difficulty fields
- `src/pages/Programs.tsx` — Supabase save logic in `handleSaveTemplate`


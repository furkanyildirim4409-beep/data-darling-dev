# Plan: Add `spotify_url` to Workout Schema (Coach App, Part 1/2)

## Schema Reality Check

The brief references tables `workouts` and `workout_templates`. In this database:

- `workouts` — **does not exist**
- `workout_templates` — exists (`id`, `coach_id`, `name`, `description`, `routine_days jsonb`, `created_at`)
- `assigned_workouts` — per-day workout instance for an athlete (`workout_name`, `exercises jsonb`, `scheduled_date`, …)
- `programs` — multi-week program container with `is_template` flag and `week_config jsonb`

The closest equivalent to "a workout" in this codebase is `assigned_workouts` (and conceptually `programs` for the parent plan). `workout_templates` matches directly.

## Step A — Database Migration

Add nullable `spotify_url TEXT` to the three workout-related tables:

```sql
ALTER TABLE public.assigned_workouts ADD COLUMN spotify_url TEXT;
ALTER TABLE public.workout_templates ADD COLUMN spotify_url TEXT;
ALTER TABLE public.programs          ADD COLUMN spotify_url TEXT;
```

No RLS changes needed — existing policies cover the new column. No default; the field is optional.

After migration, `src/integrations/supabase/types.ts` auto-regenerates with the new column.

## Step B — Shared Models

`src/types/shared-models.ts` does not currently model `Workout` or `WorkoutTemplate` directly. The closest interface is `AssignedProgram`. Add an optional Spotify field there, and introduce two new interfaces so future code has a typed surface:

```ts
export interface AssignedProgram {
  // ...existing fields
  spotifyUrl?: string | null;  // NEW
}

export interface Workout {
  id: string;
  workout_name: string;
  exercises: ProgramExercise[];
  scheduled_date?: string;
  spotify_url?: string | null;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  routine_days: unknown;
  spotify_url?: string | null;
}
```

## Step C — Save Mutations

Workout creation/update is **not** in `useStoreMutations.ts` (that file is for the e-commerce store). The real save paths are:

- `src/components/program-architect/WorkoutBuilder.tsx` + `src/pages/Programs.tsx` — program/workout authoring → writes to `programs` / `exercises` / `assigned_workouts`
- `src/components/program-architect/AssignProgramDialog.tsx` + `src/utils/dietAssignment.ts`-style helpers — bulk inserts into `assigned_workouts`
- `src/components/program-architect/SaveTemplateDialog.tsx` — writes to `workout_templates`

I will plumb `spotify_url` through these payloads so it round-trips on create/update without altering existing exercise/program logic.

## Out of Scope (Part 2)

- UI input for the Spotify URL in WorkoutBuilder/SaveTemplateDialog
- URL format validation (`open.spotify.com/...` / `spotify:` schemes)
- Mobile-side deep-link rendering

## One Confirmation Before I Run the Migration

The brief lists `workouts` (doesn't exist here) and `workout_templates`. Which mapping do you want?

- **A (recommended):** add column to all three — `assigned_workouts`, `workout_templates`, `programs`. Coach can attach a playlist at any layer (program-wide, template, or single scheduled day).
- **B:** `workout_templates` + `assigned_workouts` only.
- **C:** `workout_templates` + `programs` only (template-level only, no per-day override).

Reply with A / B / C and I'll execute.

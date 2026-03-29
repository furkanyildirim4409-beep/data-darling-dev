

## Diet Plan Assignment Synchronization (Epic 8 - Part 1/6)

### Problem

The current system stores diet assignments as a pointer (`active_diet_template_id` + `diet_start_date` + `diet_duration_weeks`) on `nutrition_targets`. The athlete app must reverse-compute which `day_number` maps to today using modulo arithmetic. The `consumed_foods` table lacks columns to track what the coach prescribed vs. what the athlete actually ate (target vs. actual serving).

### Current Architecture

```text
nutrition_targets (1 row per athlete)
  └─ active_diet_template_id ──▶ diet_templates
  └─ diet_start_date, diet_duration_weeks

diet_template_foods (template rows, day_number 1-7)
  └─ food_name, serving_size, calories, protein, carbs, fat

consumed_foods (athlete logs)
  └─ food_name, serving_size, calories, planned_food_id
  └─ NO target_serving, NO consumed_serving, NO status
```

The `useAthleteNutritionHistory` hook already computes `dayNumber = (dayOffset % 7) + 1` to map calendar dates to template days -- but it uses `bucketStart` (the query range start) instead of `diet_start_date`, causing incorrect day mapping. The athlete app has no concrete per-date records to query.

### Solution: New `assigned_diet_days` table + `consumed_foods` enhancements

Rather than materializing thousands of rows at assignment time (fragile, hard to update), we create a lightweight **view-like lookup table** that the assignment generates, plus add target tracking columns to `consumed_foods`.

### Changes

| Step | What |
|------|------|
| **Migration** | Create `assigned_diet_days` table + add `target_serving`/`consumed_serving`/`status` columns to `consumed_foods` |
| **AssignDietTemplateDialog.tsx** | After upserting `nutrition_targets`, generate concrete `assigned_diet_days` rows for each calendar date |
| **AssignDietTemplateBulkDialog.tsx** | Same generation logic for bulk assignments |
| **useAthleteNutritionHistory.ts** | Fix day_number calculation to use `diet_start_date` from nutrition_targets |

### 1. Migration

**New table: `assigned_diet_days`**

```sql
CREATE TABLE public.assigned_diet_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  template_id UUID NOT NULL,
  target_date DATE NOT NULL,
  day_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (athlete_id, target_date)
);
```

This maps each calendar date to a specific template day_number for each athlete. The `UNIQUE(athlete_id, target_date)` constraint ensures one plan per date.

RLS policies: coach ownership, team member delegation, athlete read.

**New columns on `consumed_foods`:**

```sql
ALTER TABLE public.consumed_foods
  ADD COLUMN target_serving TEXT DEFAULT NULL,
  ADD COLUMN consumed_serving TEXT DEFAULT NULL,
  ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
```

- `target_serving`: coach-prescribed amount (e.g., "100g")
- `consumed_serving`: what the athlete actually ate (e.g., "120g") -- defaults to `serving_size` on creation
- `status`: 'pending' | 'completed' | 'skipped'

### 2. Assignment Logic (both dialogs)

Extract a shared helper function `generateAssignedDietDays(athleteId, coachId, templateId, startDate, durationWeeks)`:

1. Fetch `diet_template_foods` to determine max `day_number` (template day count, typically 7)
2. Calculate total days = `durationWeeks * 7`
3. For each day `i` from 0 to totalDays-1:
   - `target_date` = startDate + i days
   - `day_number` = (i % templateDayCount) + 1
4. Delete existing `assigned_diet_days` for this athlete from startDate onward
5. Bulk insert all new rows

This function is called after the `nutrition_targets` upsert succeeds in both `AssignDietTemplateDialog` and `AssignDietTemplateBulkDialog`.

### 3. Fix `useAthleteNutritionHistory.ts`

Currently line 151 computes:
```ts
const dayOffset = differenceInDays(startOfDay(d), startOfDay(bucketStart));
const dayNumber = (dayOffset % 7) + 1;
```

This uses `bucketStart` (the UI date range start) instead of the actual `diet_start_date`. Fix to:
1. Fetch `diet_start_date` from `nutrition_targets` (already fetched)
2. If `assigned_diet_days` rows exist for the date range, use those directly (preferred path)
3. Fallback: compute `dayNumber` relative to `diet_start_date` instead of `bucketStart`

### 4. Shared Helper Location

Create `src/utils/dietAssignment.ts` with:
- `generateAssignedDietDays()` function
- Reused by both assignment dialogs

### Technical Details

- `assigned_diet_days` uses `ON CONFLICT (athlete_id, target_date) DO UPDATE` for idempotent re-assignment
- When a diet is revoked (template set to null), delete all `assigned_diet_days` for that athlete
- The `consumed_foods.status` defaults to `'pending'` -- the athlete app sets it to `'completed'` when logging, or `'skipped'` explicitly
- No edge function needed; all logic runs client-side with Supabase SDK


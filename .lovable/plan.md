

# 1-Click Multi-Day Program Assignment

## What Changes

Rewrite `AssignProgramDialog` to fetch the program's exercises, group them by day (using `order_index`), and batch-insert one `assigned_workouts` row per active day per athlete — each with the correct `scheduled_date` (startDate + dayIndex) and exercises as JSONB.

Update `ProgramDashboard` to pass the full `programId` (already done) so the dialog can fetch exercises and `week_config` internally.

## Technical Details

### `AssignProgramDialog.tsx` — Full Rewrite

**Props stay the same** (`programId`, `programName`, `open`, `onOpenChange`).

**New `handleAssign` logic:**

1. Fetch exercises: `supabase.from("exercises").select("*").eq("program_id", programId)`
2. Fetch program metadata: `supabase.from("programs").select("week_config").eq("id", programId).single()`
3. Group exercises by day: `Math.floor(order_index / 100)` → `Record<number, Exercise[]>`
4. For each day 0–6 that has exercises OR a non-"none" blockType in `week_config`:
   - Calculate date: parse `startDate` string as `YYYY-MM-DD`, add `dayIndex` days using string manipulation to avoid timezone issues (`new Date(startDate + 'T00:00:00')` → add days → format back to `YYYY-MM-DD`)
   - Build exercise JSONB: `[{ name, sets, reps, rir, failure_set, notes }]`
   - Get label from `week_config[dayIndex]?.label || "Gün ${dayIndex + 1}"`
5. For each selected athlete × each active day → build `assigned_workouts` row
6. Single batch insert

**Date handling (timezone-safe):**
```ts
const addDays = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return date.toISOString().split("T")[0]; // safe, no UTC shift
};
```

**Preview section:** Show a summary before assigning — e.g., "7 gün × 2 sporcu = 14 antrenman ataması"

### Files Modified
- `src/components/program-architect/AssignProgramDialog.tsx` — rewrite handleAssign with batch logic + add day preview summary

No database changes needed — `assigned_workouts` already has `exercises` (jsonb), `workout_name`, `scheduled_date`, `program_id`.


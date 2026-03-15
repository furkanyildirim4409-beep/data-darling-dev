

## Assignment Bug Hotfix 2.0

### Root Cause

Line 148-153: The `assigned_workouts` update uses `.eq("status", "pending")` which silently matches zero rows if statuses differ. Additionally, no error is captured — the result is discarded.

### Changes — `src/services/ActionEngine.ts`

#### Fix 1: Date-based routing with error handling (Program, lines 147-153)

Replace the current Step F with:

```typescript
// Step F (HOTFIX): Re-route future calendar assignments to new program
const todayStr = new Date().toISOString().split("T")[0];
const { error: assignUpdateErr } = await supabase
  .from("assigned_workouts")
  .update({ program_id: newProgramId } as any)
  .eq("athlete_id", athleteId)
  .eq("program_id", sourceProgramId)
  .gte("scheduled_date", todayStr);

if (assignUpdateErr) throw new Error("Failed to re-route calendar: " + assignUpdateErr.message);
```

This uses `scheduled_date >= today` instead of `status = 'pending'`, catching all future assignments regardless of status. The thrown error triggers the rollback block, preventing orphaned clones.

#### Fix 2: Nutrition target error enforcement (lines 284-290)

Already has error handling — no change needed. The existing `if (assignErr) throw` is correct.

### Files

| File | Change |
|------|--------|
| `src/services/ActionEngine.ts` | Replace status-based filter with date-based `gte("scheduled_date", todayStr)` + add error throw |


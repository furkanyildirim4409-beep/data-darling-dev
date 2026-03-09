

# Fix: Assignment Preview Dates & Exercise JSON Completeness

## Problem
1. **Preview date mismatch**: Day labels are pushed into a flat array, so badge dates use sequential index `i` (0,1,2...) instead of actual `dayIdx` (e.g., 0,2,5). If Day 1 and Day 3 are active, preview shows them on consecutive dates instead of correct offsets.
2. **Exercise JSON missing fields**: The mapped exercises don't include `order_index` (relative within day) for proper ordering on athlete side.

## Changes — `AssignProgramDialog.tsx`

### Fix 1: Track actual dayIndex in preview
Store `{ label, dayIdx }` pairs instead of flat label strings, so badge dates use `addDays(scheduledDate, dayIdx)` — the real offset.

```ts
// Before: labels.push(cfg?.label || `Gün ${i + 1}`)
// After:
const activeDays: Array<{ label: string; dayIdx: number }> = [];
// ... in loop:
activeDays.push({ label: cfg?.label || `Gün ${i + 1}`, dayIdx: i });
```

Update badge rendering to use `day.dayIdx` for date calculation.

### Fix 2: Add order_index to exercise JSON
Add `order_index: (ex.order_index ?? 0) % 100` to the mapped exercise objects so athlete-side rendering preserves exercise order within each day.

### Single file changed
`src/components/program-architect/AssignProgramDialog.tsx`




## Align Diet Assignment with Workout Architecture (Epic 8)

### Problem
The current `generateAssignedDietDays` blindly maps all 7 days using ISO weekday logic. It needs to match the workout builder pattern: snap start date to Monday, use `(i % 7) + 1` for day mapping, and only assign days that actually have food in the template.

### Changes

| File | Change |
|------|--------|
| `src/utils/dietAssignment.ts` | Rewrite: fetch populated days from template, use `(i % 7) + 1` loop, skip empty days |
| `src/components/athlete-detail/AssignDietTemplateDialog.tsx` | Snap calendar `onSelect` to Monday via `startOfWeek`, add helper text |
| `src/components/program-architect/AssignDietTemplateBulkDialog.tsx` | Same Monday-snap + helper text |

### 1. `src/utils/dietAssignment.ts` — Full rewrite

- Query `diet_template_foods` for distinct `day_number` values → `populatedDays` Set
- Loop `i = 0` to `totalDays - 1`, compute `templateDayNumber = (i % 7) + 1`
- Only push row if `populatedDays.has(templateDayNumber)`
- Delete + chunked insert unchanged

Since `startDate` is guaranteed Monday, `i=0` → day 1 (Mon), `i=6` → day 7 (Sun), repeating.

### 2. Both Dialogs — Monday snap

- Import `startOfWeek` from `date-fns`
- Change `onSelect`: `onSelect={(d) => d && setStartDate(startOfWeek(d, { weekStartsOn: 1 }))}`
- Add below calendar popover: `<p className="text-[10px] text-muted-foreground">Seçtiğiniz tarih haftanın Pazartesi gününe yuvarlanır</p>`

### Technical Notes
- `getNextMonday()` already returns a Monday — no change needed for default state
- `startOfWeek` with `weekStartsOn: 1` returns the Monday of the selected date's week, ensuring any user pick snaps correctly
- This is identical to the workout assignment pattern


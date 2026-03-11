

# Real Calendar Dates for Recurring Assignments

## Overview
Re-introduce a "Başlangıç Tarihi" (Start Date) date picker in both assignment dialogs. When saving, calculate the actual `scheduled_date` for each day based on the start date + day offset, while keeping the `day_of_week` column intact.

## Changes

### 1. `AssignProgramDialog.tsx`
- Add `startDate` state (default: next Monday)
- Add a date picker UI (Popover + Calendar) labeled "Başlangıç Tarihi" between the day preview and athlete list
- In `handleAssign`, calculate `scheduled_date` for each day: `startDate + dayIdx days` (where dayIdx 0 = Monday)
- Update preview badges to show both day name and calculated date

### 2. `BulkAssignDialog.tsx`
- Same start date picker added in step 2 (athlete selection step), before the athlete list
- Same date calculation logic in `handleAssign`

### 3. `ProgramTab.tsx`
- In the weekly template cards, display `scheduled_date` next to `day_of_week` when available
- Format as "Pazartesi — 16 Mart 2026"
- Already fetches `scheduled_date` in the query, just needs display logic

### Date Calculation Logic
```typescript
import { addDays, format, startOfWeek } from "date-fns";
import { tr } from "date-fns/locale";

// Default start = next Monday
const getNextMonday = () => {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 });
  return addDays(start, 7); // next Monday
};

// For each active day with dayIdx (0=Mon, 6=Sun):
const scheduledDate = format(addDays(startDate, dayIdx), "yyyy-MM-dd");
```

### Technical Notes
- `date-fns` is already installed (v3.6.0)
- No schema changes needed — `scheduled_date` column already exists
- Both `day_of_week` and `scheduled_date` are saved together
- The start date represents the Monday of the target week




## Strict Weekday Mapping Hotfix (Epic 8 - Part 1 Hotfix)

### Problem

`generateAssignedDietDays` uses modulo-based sequential mapping (`(i % templateDayCount) + 1`), meaning day_number cycles through template days regardless of weekday. The correct behavior: day_number must equal the ISO weekday (1=Monday, 7=Sunday), matching the workout program architecture.

### Changes

| File | What |
|------|------|
| `src/utils/dietAssignment.ts` | Remove template day count query + modulo logic; use `getDay()` mapped to ISO weekday |
| `src/hooks/useAthleteNutritionHistory.ts` | Fix both fallback branches to use ISO weekday instead of modulo offset |

### 1. `src/utils/dietAssignment.ts`

Remove lines 17-24 (the `diet_template_foods` query for `uniqueDays`/`templateDayCount`). Replace the `day_number` computation on line 42:

```typescript
const currentDate = addDays(startDate, i);
let dayOfWeek = currentDate.getDay(); // 0=Sun, 1=Mon...6=Sat
if (dayOfWeek === 0) dayOfWeek = 7;   // Sun → 7

rows.push({
  ...
  day_number: dayOfWeek,
});
```

The Supabase query for template day numbers is no longer needed since day_number is purely calendar-driven.

### 2. `src/hooks/useAthleteNutritionHistory.ts` (lines 168-174)

Replace both fallback branches with strict weekday:

```typescript
if (assignedDay !== undefined) {
  dayNumber = assignedDay;
} else {
  dayNumber = d.getDay() || 7; // 0(Sun)→7, 1(Mon)→1, etc.
}
```

The `dietStartDateStr` offset fallback is removed — weekday identity is intrinsic to the date itself, no reference date needed.

### Technical Notes

- ISO weekday mapping: Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=7
- This matches the diet template builder which uses day_number 1-7 for Mon-Sun
- No migration needed — only TypeScript logic changes


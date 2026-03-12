
# Fix Nutrition Save Flow for 7-Day Structure

## 1. Database Migration
Add `day_number` column to `diet_template_foods`:
```sql
ALTER TABLE public.diet_template_foods ADD COLUMN IF NOT EXISTS day_number integer DEFAULT 1;
```

## 2. Update Save Flow in `Programs.tsx` (lines 340-403)

Current code saves all foods flat without `day_number`. Changes:

- **`target_calories`**: Calculate as daily average (total kcal across all days / number of days with items) instead of raw total sum.
- **`foodRows` mapping**: Add `day_number: item.dayIndex + 1` (converting 0-indexed UI state to 1-indexed DB column).
- Everything else (meal_type mapping, macro calculations, atomic insert/rollback) stays the same.

### Key change in the food row mapping (line 376-387):
```typescript
// Before:
.map((item) => ({
  template_id: template.id,
  meal_type: mealTypeMap[item.mealId] || "snack",
  food_name: item.name.trim(),
  ...
}));

// After:
.map((item) => ({
  template_id: template.id,
  day_number: item.dayIndex + 1,  // NEW: 1-7
  meal_type: mealTypeMap[item.mealId] || "snack",
  food_name: item.name.trim(),
  ...
}));
```

### Key change in target_calories (line 355-358):
```typescript
// Before: raw total
const totalCals = selectedNutrition.reduce(...);

// After: daily average
const daysWithItems = new Set(selectedNutrition.map(i => i.dayIndex)).size;
const totalCals = selectedNutrition.reduce(...);
const avgDailyCals = daysWithItems > 0 ? Math.round(totalCals / daysWithItems) : 0;
```

## 3. AssignDietTemplateDialog Compatibility
The `AssignDietTemplateDialog` fetches template foods and aggregates totals — it sums all foods regardless of day, so it will continue working correctly. The `day_number` column is additive and doesn't break existing queries.

## Files
- **Migration**: Add `day_number` column to `diet_template_foods`
- **Modify** `src/pages/Programs.tsx` lines 340-403 — add `day_number` to food rows, use daily average for `target_calories`

# Dialog Scroll Fix + Live Template Previews

## 1. Scroll repair (both dialogs)

In `AssignTrainingDialog.tsx` and `AssignDietTemplateDialog.tsx`, replace the current `<ScrollArea className="flex-1 pr-2 -mr-2">` wrapper around the template list with:

```tsx
<ScrollArea className="h-[440px] max-h-[50vh] w-full pr-2">
  <div className="grid grid-cols-1 gap-3 pb-4">
    {/* existing item cards */}
  </div>
</ScrollArea>
```

This gives the list a guaranteed scrollable height instead of relying on the flex parent, fixing the "only 4 items visible" clipping. Keep the loading / empty branches inside the same container so they render in place.

## 2. Click-to-preview Sheet on each card

### Training dialog
- Add a new `previewProgram: ProgramOption | null` state plus `previewExercises` cache keyed by `program_id`.
- Make the entire card clickable (`role="button"`, `onClick`) — clicking opens the preview sheet. The existing "Ata" button gets `onClick={(e) => { e.stopPropagation(); handleAssign(prog); }}` so it doesn't trigger the preview.
- On open, fetch exercises for that `program_id` from the `exercises` table (`name, sets, reps, rir, rest_time, notes, order_index`) ordered by `order_index`. Group by `Math.floor(order_index / 100)` → "Gün 1 / Gün 2 / ...".
- Render a `<Sheet side="right" className="w-full sm:max-w-md">` with header (title + close button via `SheetClose`), then for each day a collapsible block listing exercises: name, `{sets} x {reps}`, `RIR {rir}` badge, `Dinlenme: {rest_time}`, plus notes if present. Wrap the body in a native scroll container `h-[calc(100vh-120px)] overflow-y-auto`.

### Diet dialog
- Same pattern: `previewTemplate` state + cached fetch from `diet_template_foods` filtered by `template_id`, selecting `meal_name, meal_order, food_name, portion, unit, calories, protein, carbs, fat, coach_notes` (whatever columns exist — verify via a quick view), ordered by `meal_order, id`.
- Group rows by `meal_name` (or `Öğün ${meal_order}` fallback). Each meal section shows food rows with portion + macro chips (kcal yellow, P blue, C green, F purple — per project memory) and any `coach_notes` rendered below the meal title.
- Same right-side Sheet with `SheetClose` in the header.

### Shared notes
- Use shadcn `<Sheet>` from `@/components/ui/sheet` (already in repo).
- Preview Sheet sits inside the same component tree as the Dialog; mounting both is fine — Radix layers handle z-index.
- Cards get `cursor-pointer hover:border-primary/40 transition-colors` to signal click affordance.

## Out of scope
- No changes to assignment logic, Monday snap, or DB schema.
- No changes to `ProgramTab.tsx` or other consumers.

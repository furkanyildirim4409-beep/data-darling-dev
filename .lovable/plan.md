## Goal

Bring "Dynamic Food Portions & Gram Mode" to the Coach Panel's Nutrition Builder. Frontend only — the existing `search-food` edge function (which already returns `{ servings: [...] }` for `{ food_id }`) is left untouched.

## Files

### 1. NEW — `src/components/program-architect/FoodPortionDialog.tsx`

Radix `<Dialog>` that opens after a food search result is clicked. Props:

```ts
{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  foodName: string;
  servings: ApiServing[];          // raw array from edge function
  onConfirm: (result: PortionResult) => void;
}
```

Behavior:
- Servings dropdown (`<Select>`) — default = first serving.
- Detect 100g/100ml metric mode:
  ```ts
  const is100Mode =
    /^(100\s?g|100\s?ml)$/i.test(selected?.serving_description ?? "") ||
    (Number(selected?.metric_serving_amount) === 100 &&
      ["g", "ml"].includes(String(selected?.metric_serving_unit).toLowerCase()));
  ```
- Quantity `<Input type="number">`:
  - `is100Mode` → default `100`, step `10`, label "Miktar (g/ml)".
  - else → default `1`, step `0.5`, label "Miktar".
- `multiplier = is100Mode ? quantity / 100 : quantity`.
- Live macro preview (kcal / P / C / F) with the same color tokens used elsewhere in builder.
- On confirm, build:
  ```ts
  const unit = is100Mode
    ? (selected.metric_serving_unit || "g")
    : (selected.serving_description || "Adet");
  const serving_size = `${quantity} × ${unit}`;
  ```
  and emit `{ kcal, protein, carbs, fat, serving_size, amount: quantity, unit }`.

### 2. UPDATE — `src/components/program-architect/ProgramLibrary.tsx`

- Extend `LibraryItem` (locally) with optional `api_food_id?: string` and `serving_size?: string`.
- In the nutrition search mapper (lines ~468–479), preserve `api_food_id: item.food_id ?? item.id`.
- New state: `portionLoadingId`, `portionDialog: { open, foodName, servings } | null`.
- Replace direct call path for API items inside `handleAddWithSync`:
  - If `item.id.startsWith("api-")` and has `api_food_id`:
    1. set `portionLoadingId = item.id` → row shows `<Loader2 />` instead of `+`.
    2. `await supabase.functions.invoke("search-food", { body: { food_id: item.api_food_id } })`.
    3. Open `FoodPortionDialog` with `data.servings`.
    4. On confirm, build the enriched item:
       ```ts
       const enriched = {
         ...item,
         kcal: result.kcal,
         protein: result.protein,
         carbs: result.carbs,
         fats: result.fat,
         serving_size: result.serving_size,
       };
       ```
       then call existing sync logic (`onAddItem(enriched)` + `food_items` upsert with `serving_size: result.serving_size`).
- Coach foods that are not API-sourced keep current behavior (no dialog).
- Pass `portionLoadingId` into `LibraryItemCard` so it can swap `+` → `Loader2`.

### 3. UPDATE — `src/components/program-architect/NutritionBuilder.tsx`

Avoid double-scaling for items already prorated by the dialog.

- Extend `NutritionItem` with `serving_size?: string`.
- New `calcFactor`:
  ```ts
  function calcFactor(item: NutritionItem) {
    if (item.serving_size) return item.amount;          // per-portion: amount is the multiplier of "1 serving"
    return item.unit === "adet" ? item.amount : item.amount / 100;
  }
  ```
  When the dialog set `amount = quantity` and macros are already for that quantity, we want `multiplier = 1` per row by default. To stay consistent with the editable amount input, set `amount = 1` on insert and store the `quantity × unit` string in `serving_size`. Update insertion in ProgramLibrary accordingly.
- Render the unit label cleanly: if `item.serving_size` exists, show it next to amount input (e.g. "× 50 g") and hide the raw `unit` text.

### 4. Acknowledgement

No edge functions modified. `supabase/functions/search-food/index.ts` remains untouched.

## Technical Notes

- Servings array shape assumed: `{ serving_id, serving_description, metric_serving_amount, metric_serving_unit, calories, protein, carbohydrate, fat }`. Map `carbohydrate → carbs`.
- Toast on dialog confirm: "Besin {quantity}{unit} olarak eklendi".
- All colors via existing semantic tokens (warning / success / blue-500 / purple-500) already used in the builder.

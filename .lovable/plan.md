Acknowledged. Both tweaks integrated as hard guardrails.

## Goal

Replace the "pre-multiplied + ugly serving_size" pipeline with a strict **Base-Unit** macro storage (per 1 g/ml or per 1 serving). Builder multiplies by an editable `amount` that stays a free-form string in React state and is coerced to `Number` only at math/save boundaries.

No edge functions touched. `search-food` remains as-is.

---

## TWEAK 1 — DB string format (anti data-corruption)

Every serving_size written to the DB MUST be:

```ts
serving_size: `${amount} ${unit}`.trim()   // mandatory single space
```

So `5` × `1 large` → `"5 1 large"`, NOT `"51 large"`. Loader regex `^(\d+\.?\d*)\s+(.*)$` (note `\s+`, not `\s*`) safely splits `5` from `1 large`.

## TWEAK 2 — React input free-typing (anti zero-lock)

`NutritionItem.amount` is typed as `number | string` for intermediate UI state.

- `<Input value={item.amount} onChange={e => onUpdateItem(id, "amount", e.target.value)} />` — no coercion in event handler. Backspace, `0.`, empty string all allowed.
- `Number(item.amount) || 0` is applied ONLY at:
  - `calcFactor(item)`
  - day/meal totals
  - DB save (`Number(item.amount) || 0`)
  - `food_items` upsert quantity
- Optional `onBlur` re-emits the parsed number to normalize ("0." → "0.5" only on commit), but is not required.

---

## Files

### 1. `src/components/program-architect/FoodPortionDialog.tsx`

Stop pre-multiplying. New `PortionResult`:
```ts
export interface PortionResult {
  kcal: number;       // per 1 base unit
  protein: number;
  carbs: number;
  fat: number;
  serving_size: string;     // "g" | "ml" | "1 large"
  unit: string;             // mirrors serving_size
  selected_quantity: number;
}
```
`handleConfirm`:
- `is100Mode` → `per1 = raw/100`, `serving_size = (metric_serving_unit || "g").trim()`
- else → `per1 = raw`, `serving_size = (selected.serving_description || "Porsiyon").trim()`
- Live preview keeps showing `quantity × per1` (visual only).
- Confirm label: `${quantity} × ${serving_size}`.

### 2. `src/components/program-architect/ProgramLibrary.tsx`

`handlePortionConfirm`:
```ts
const enriched: LibraryItem & { _tempAmount?: number } = {
  ...src,
  kcal: result.kcal,           // per 1 unit
  protein: result.protein,
  carbs: result.carbs,
  fats: result.fat,
  serving_size: result.serving_size, // "g" | "1 large" — clean
  unit: result.serving_size,
  amount: 1,
  _tempAmount: Number(result.selected_quantity) || 1,
};
onAddItem(enriched);
persistFoodItem(enriched);
```
`persistFoodItem` writes the clean base-unit row (macros per 1 unit, `serving_size` = `"g"` / `"1 large"`). `onConflict: name,coach_id` keeps the library deduplicated regardless of the user's chosen quantity.

### 3. `src/pages/Programs.tsx`

**`handleAddItem` (nutrition branch):**
```ts
const tempAmt = Number((item as any)._tempAmount);
const hasPortion = !!item.serving_size;
const newNutrition: NutritionItem = {
  ...item,
  id: `${item.id}-${Date.now()}`,
  amount: hasPortion ? (Number.isFinite(tempAmt) && tempAmt > 0 ? tempAmt : 1) : 100,
  unit: item.serving_size || (item.name.includes("(Adet)") ? "adet" : "g"),
  serving_size: item.serving_size,
  mealId: activeMealId,
  dayIndex: activeNutritionDay,
};
```

**`handleUpdateNutrition`:** pass-through (no coercion). Keeps strings allowed:
```ts
setSelectedNutrition(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n));
```

**Edit-mode loader (~lines 103–123):** new regex with `\s+`:
```ts
const raw = (f.serving_size || "100g").trim();
const m = raw.match(/^(\d+\.?\d*)\s+(.*)$/) || raw.match(/^(\d+\.?\d*)(g|ml|adet)$/i);
const amount = m ? parseFloat(m[1]) : 1;
const unitLabel = m ? (m[2] || "").trim() : raw;

const isLegacy100 = /^100\s?(g|ml)$/i.test(raw);
const div = isLegacy100 ? 100 : (m ? amount : 1);

return {
  id: f.id, name: f.food_name, category: "Genel", type: "nutrition",
  kcal: Math.round((f.calories || 0) / div),
  protein: Math.round((f.protein || 0) / div),
  carbs: Math.round((f.carbs || 0) / div),
  fats: Math.round((f.fat || 0) / div),
  amount: Number(amount) || 1,
  unit: unitLabel || "g",
  serving_size: unitLabel || "g",
  mealId: reverseMealMap[f.meal_type] || "meal-2",
  dayIndex: (f.day_number || 1) - 1,
};
```

**Save path (~lines 553–610):** import `calcFactor` from NutritionBuilder for a single source of truth. Build `serving_size` with the mandatory space:
```ts
const amt = Number(item.amount) || 0;
const factor = calcFactor(item);
const row = {
  template_id: templateId,
  day_number: item.dayIndex + 1,
  meal_type: mealTypeMap[item.mealId] || "snack",
  food_name: item.name.trim(),
  serving_size: `${amt} ${item.unit}`.trim(), // TWEAK 1 — single space, no concat corruption
  calories: Math.round((item.kcal || 0) * factor),
  protein:  Math.round((item.protein || 0) * factor),
  carbs:    Math.round((item.carbs   || 0) * factor),
  fat:      Math.round((item.fats    || 0) * factor),
};
```
`totalCals`/`avgDailyCals` also switch to `calcFactor`.

### 4. `src/components/program-architect/NutritionBuilder.tsx`

- Type widen: `amount: number | string` on `NutritionItem` (or accept `any` for UI-only).
- Export and use single `calcFactor`:
  ```ts
  export function calcFactor(item: NutritionItem): number {
    const amt = Number(item.amount) || 0;
    if (item.serving_size && /^100\s?(g|ml)$/i.test(item.serving_size)) return amt / 100; // legacy
    if (item.serving_size) return amt;                                                      // per-unit
    return item.unit === "adet" ? amt : amt / 100;                                          // pure raw fallback
  }
  ```
- Amount input — TWEAK 2 (free typing):
  ```tsx
  <Input
    type="text"
    inputMode="decimal"
    value={item.amount as any}
    onChange={(e) => onUpdateItem(item.id, "amount", e.target.value)}
    className="h-7 w-16 text-xs text-center bg-background/50"
  />
  <span className="text-[10px] text-muted-foreground">{item.serving_size || item.unit}</span>
  ```
  No "× " prefix, no hardcoded "adet" — UI just renders `[ 5 ] 1 large` or `[ 50 ] g`.
- All macro/total math goes through `calcFactor`, so `Number()` coercion lives in exactly one place.

---

## Acceptance checks

1. Add "Egg, large" → quantity 5 → builder row reads `[ 5 ] 1 large`, macros = 5× per-serving. DB row: `serving_size: "1 large"`, macros per 1 serving.
2. Add "Chicken breast" 100 g mode → quantity 150 → `[ 150 ] g`, macros = 150×. DB row: `serving_size: "g"`, macros per 1 g.
3. Type in amount: backspace clears the field; `0.5` typeable; `1` followed by `1` displays `11` only because user typed it (no state mutation/double-fire). No more accidental `"1"+"1"` concat in DB — save coerces to `Number`.
4. Save → reload program → row reappears with `5 1 large` parsed cleanly to `amount=5`, `unit="1 large"`, identical macros. Round-trip lossless.
5. Legacy `100g` rows still render with correct macros via `calcFactor`'s legacy branch.

## Out of scope

- Edge function changes.
- DB schema/migrations.
- Athlete-side rendering (contract preserved: `serving_size` + totals).

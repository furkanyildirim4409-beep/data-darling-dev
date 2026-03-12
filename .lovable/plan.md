

# Nutrition Builder 7-Day Overhaul

## Summary
Transform the NutritionBuilder from a flat meal-tab view to a 7-day structure mirroring the Exercise Builder, fix macro badge visibility in the library sidebar, and add live daily/weekly counters.

## Changes

### 1. `ProgramLibrary.tsx` — Fix Macro Badges in LibraryItemCard
Replace the tiny `<span>` on line 124 with proper colored `Badge` components:
- Calories: yellow/warning (`bg-warning/20 text-warning`)
- Protein: blue (`bg-blue-500/20 text-blue-400`)
- Carbs: green (`bg-success/20 text-success`)
- Fat: purple (`bg-purple-500/20 text-purple-400`)

Display them as a flex-wrap row of badges below the food name, same visual weight as the kcal badge already there.

### 2. `NutritionBuilder.tsx` — 7-Day + Meal Sections

**Interface changes:**
- `NutritionItem` gets new field: `dayIndex: number`
- Props add `activeNutritionDay: number` and `setActiveNutritionDay: (day: number) => void`

**Top selector:** Replace the 6 meal-tab buttons with 7 day buttons (Pzt, Sal, Çar, Per, Cum, Cmt, Paz). Active day highlighted with primary color.

**Body:** Inside the selected day, render 4 collapsible `Accordion` sections for meals:
- Kahvaltı (meal-1)
- Öğle Yemeği (meal-3)
- Ara Öğün (meal-2, meal-4 combined)
- Akşam Yemeği (meal-5)

Each section shows its food items filtered by `dayIndex === activeNutritionDay && mealId === X`. Empty sections show a dashed placeholder.

**Food cards:** Each card displays macro badges (P, C, F) calculated from serving size, not just calories.

**Live counters:**
- **Selected day total**: "Pazartesi Toplamı: X kcal (P: Yg, C: Zg, F: Wg)" — sums items where `dayIndex === activeNutritionDay`
- **Weekly average**: "Haftalık Ortalama: X kcal/gün" — total across all 7 days divided by days that have items

### 3. `Programs.tsx` — State Updates

- Add `activeNutritionDay` state (default 0), passed to NutritionBuilder
- Update `handleAddItem` for nutrition mode: set `dayIndex: activeNutritionDay` on new items alongside existing `mealId: activeMealId`
- Update save flow's `mealTypeMap` to also store day info (the `diet_template_foods` table can use the existing `meal_type` field; day info can be encoded in `serving_size` notes or a future column — for now we keep the flat insert but items carry day context)

### Files to modify:
- `src/components/program-architect/ProgramLibrary.tsx` — macro badges
- `src/components/program-architect/NutritionBuilder.tsx` — full rewrite to 7-day structure
- `src/pages/Programs.tsx` — new state, updated add/save handlers


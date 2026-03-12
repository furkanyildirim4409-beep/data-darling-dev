

## Persistent Nutrition Builder - Auto-Sync API Foods to DB

### Analysis

Currently, when a coach searches for food via the API, results get temporary IDs (`api-${Date.now()}-${i}`) and live only in local state. The macro data IS saved when the template is saved (into `diet_template_foods`), but there's no reusable food library — coaches must re-search the API every time.

The `food_items` table does not exist yet. We need to create it.

### Plan

**1. DB Migration: Create `food_items` table**

```sql
CREATE TABLE public.food_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text DEFAULT 'Genel',
  calories integer DEFAULT 0,
  protein numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  fat numeric DEFAULT 0,
  serving_size text DEFAULT '100g',
  api_food_id text,
  coach_id uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(name, coach_id)
);

ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own food items"
  ON public.food_items FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "All authenticated can view food items"
  ON public.food_items FOR SELECT TO authenticated
  USING (true);
```

**2. `ProgramLibrary.tsx` — Auto-sync on add**

When the `onAddItem` callback fires for a nutrition item with an `api-` prefixed ID:
- Upsert into `food_items` with `name`, `calories`, `protein`, `carbs`, `fat`, `coach_id`
- Replace the temporary `api-` ID with the real UUID from the upsert response
- This happens transparently — no extra UI step needed

**3. `ProgramLibrary.tsx` — Load coach's food library as default results**

When `builderMode === "nutrition"` and search is empty (< 2 chars):
- Fetch from `food_items` where `coach_id = user.id` instead of the hardcoded `nutrition` array
- Show these as the coach's personal food library
- When search >= 2 chars, still query the API but also merge local DB matches

**4. UI indicators**

- In `LibraryItemCard`: if item type is "nutrition" and ID is NOT `api-` prefixed (i.e., already in DB), show a small checkmark badge
- Show a brief toast "Besin kütüphaneye eklendi" on first sync of an API food

### File Changes

- **Migration**: New `food_items` table with RLS
- **Edit**: `src/components/program-architect/ProgramLibrary.tsx` — add upsert-on-add logic, load from DB when no search, checkmark indicator
- **Edit**: `src/components/program-architect/NutritionBuilder.tsx` — no changes needed (it already works with the LibraryItem interface)

### Technical Details

- `UNIQUE(name, coach_id)` allows different coaches to have the same food with different macros
- The upsert uses `onConflict: 'name,coach_id'` to avoid duplicates
- Hardcoded `nutrition` array (lines 42-58) will be kept as fallback seed data but DB results take priority
- The sync is fire-and-forget (non-blocking) so it doesn't slow down the add flow




## Supplement Assignment Architecture

### Summary
Add a full supplement assignment flow to the Coach Panel: a dialog to create/assign supplements, a mutation hook, and an enhanced SupplementsPanel with the "Assign" button and delete capability.

### What Changes

**1. New file: `src/hooks/useSupplementMutations.ts`**
- `assignSupplement(payload)` — inserts into `assigned_supplements` with fields: `athlete_id`, `coach_id`, `name_and_dosage`, `dosage`, `timing`, `icon`, `total_servings`, `servings_left` (= total_servings), `is_active: true`
- `deleteSupplement(id)` — deletes row by id
- `toggleSupplement(id, currentState)` — updates `is_active` (replaces inline logic in SupplementsPanel)
- Uses `useAuth()` to get `activeCoachId`

**2. New file: `src/components/athlete-detail/AssignSupplementDialog.tsx`**
- Dialog component matching existing design language (same pattern as `AssignDietTemplateDialog`)
- Props: `open`, `onOpenChange`, `athleteId`, `onAssigned`
- Form fields:
  - **Supplement Name** — text input (e.g. "Whey Protein", "Creatine Monohydrate")
  - **Dosage** — text input (e.g. "1 Ölçek", "5g", "2 Kapsül")
  - **Timing** — Select dropdown: Sabah, Antrenman Öncesi, Antrenman Sonrası, Öğün Arası, Yatmadan Önce
  - **Total Servings** — number input, default 30
  - **Icon** — clickable emoji grid: 💊 🥤 🧴 🐟 🥩 🫐 🍵 💪
- Constructs `name_and_dosage` as `"{name} - {dosage}"` for backward compatibility
- Calls `useSupplementMutations().assignSupplement()` on submit
- Shows toast on success/error

**3. Update: `src/components/athlete-detail/SupplementsPanel.tsx`**
- Add "Takviye Ata" button in the card header (opens AssignSupplementDialog)
- Expand the `Supplement` interface to include `dosage`, `timing`, `icon`, `servings_left`, `total_servings`
- Fetch all new columns from Supabase
- Display icon, timing badge, and servings progress (e.g. "12/30 kalan") per item
- Add delete button (trash icon) per supplement using the mutation hook
- Refactor toggle logic to use the shared hook
- Callback `onAssigned` triggers re-fetch

**4. No database migration needed**
The `assigned_supplements` table already has all required columns (`dosage`, `timing`, `icon`, `total_servings`, `servings_left`, `coach_id`, `athlete_id`, `name_and_dosage`, `is_active`, `source_insight_id`). RLS policies for coach CRUD are already in place.

### Technical Details

- `name_and_dosage` is composed as `"${name} - ${dosage}"` to maintain compatibility with existing athlete app display
- `servings_left` is initialized to equal `total_servings` on assignment
- The dialog follows the exact same Dialog/DialogContent/DialogHeader pattern used by `AssignDietTemplateDialog`
- Auth context provides `activeCoachId` which maps to `coach_id` in the insert
- The SupplementsPanel already lives in the DraggableCardLayout on the "general" tab — no routing changes needed


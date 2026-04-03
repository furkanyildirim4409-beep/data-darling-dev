

## Supplement Program Architect — Full Template System

### Summary
Add a complete Supplement Template system to the `/programs` page, mirroring Workout and Nutrition templates. Coaches create, save, edit, duplicate, delete, and assign Supplement Programs from the same dashboard.

### 1. Database Migration

Create 3 tables with RLS and seed data in a single migration file.

**`supplements_library`** — Global supplement catalog
- `id` uuid PK, `name` text NOT NULL, `category` text DEFAULT 'Genel', `default_dosage` text, `description` text, `icon` text DEFAULT '💊'
- RLS: All authenticated can SELECT. Coaches can ALL (for custom entries).
- Seed 10 items: Creatine Monohydrate (💪, 5g/gün), Whey Protein (🥤, 30g/servis), Omega 3 (🐟, 1000mg), Magnesium Bisglycinate (💊, 400mg), Vitamin D3+K2 (☀️, 2000IU), BCAA (🧴, 10g), Pre-Workout (⚡, 1 ölçek), ZMA (🌙, 3 kapsül), Beta-Alanine (💊, 3.2g), Glutamine (💊, 5g)

**`supplement_templates`** — Coach-owned templates
- `id` uuid PK, `coach_id` uuid NOT NULL, `name` text NOT NULL, `description` text, `created_at` timestamptz DEFAULT now(), `is_template` boolean DEFAULT true
- RLS: Coach owns + team member access (same pattern as `programs`/`diet_templates`)

**`supplement_template_items`** — Items within a template
- `id` uuid PK, `template_id` uuid NOT NULL REFERENCES supplement_templates(id) ON DELETE CASCADE, `supplement_name` text NOT NULL, `dosage` text, `timing` text DEFAULT 'Sabah', `icon` text DEFAULT '💊', `order_index` integer DEFAULT 0
- RLS: Via parent template coach_id subquery (same pattern as `diet_template_foods`)

### 2. New Hook: `src/hooks/useSupplementTemplates.ts`

CRUD operations matching existing patterns:
- `fetchSupplementTemplates()` — queries `supplement_templates` + count of items per template (same pattern as `fetchDietTemplates` in ProgramDashboard)
- `fetchSupplementLibrary(search?)` — queries `supplements_library` with optional ilike search
- `saveSupplementTemplate(name, description, items, editingId?)` — insert or update template + delete-then-reinsert items (same pattern as nutrition save)
- `deleteSupplementTemplate(id)` — delete items then template
- `duplicateSupplementTemplate(id, name)` — clone template + items

### 3. New Component: `src/components/program-architect/SupplementBuilder.tsx`

A flat-list builder (no 7-day structure, no meal sections). Simpler than NutritionBuilder:
- Each row: icon (emoji), supplement name, dosage (text input), timing (Select dropdown with TIMING_OPTIONS from AssignSupplementDialog)
- Remove button per row
- "Tümünü Temizle" button
- Summary footer showing total supplement count

**SupplementItem interface:** `{ id, name, dosage, timing, icon, category }`

### 4. Modify `ProgramDashboard.tsx`

- Extend `ProgramData.type` to include `"supplement"`
- Extend `viewMode` state to `"exercise" | "nutrition" | "supplement"`
- Replace the binary Switch toggle with a 3-button segmented control using styled buttons (Antrenman | Beslenme | Takviye) inside the existing `glass` container
- Add `fetchSupplementTemplates()` that queries `supplement_templates` + item counts, called when `viewMode === "supplement"`
- Add `supplementTemplates` state, render supplement cards with 💊 icon and item count badge
- Dropdown actions for supplement cards: Edit, Duplicate, Delete, Export, Assign (bulk-insert into `assigned_supplements`)
- Empty state for supplement tab
- "Takviye Programı Oluştur" button when in supplement mode

### 5. Modify `Programs.tsx`

- Extend `builderMode` to `"exercise" | "nutrition" | "supplement"`
- Add `selectedSupplements` state array for SupplementBuilder items
- `handleCreateProgram` supports `"supplement"` type — resets supplement state and enters builder
- `handleEditProgram` extended: when type is `"supplement"`, fetch `supplement_template_items` and populate `selectedSupplements`
- Replace binary Switch in builder header with same 3-button segmented control
- Render `SupplementBuilder` when `builderMode === "supplement"` (center column)
- For supplement mode: `ProgramLibrary` gets `builderMode="supplement"` which shows `supplements_library` items
- `handleAddItem` extended: when supplement mode, push to `selectedSupplements`
- `handleSaveProgram` extended: supplement branch inserts into `supplement_templates` + `supplement_template_items`
- `SaveTemplateDialog` receives `mode="supplement"`
- Right column (WeeklySchedule) hidden for supplement mode — show a simple summary card instead

### 6. Modify `ProgramLibrary.tsx`

- When `builderMode === "supplement"`, fetch from `supplements_library` instead of exercise/food libraries
- Display supplement items with emoji icons, category, default dosage
- Search filters by name (ilike)
- No API search tab for supplements — library only

### 7. Modify `SaveTemplateDialog.tsx`

- Add `mode: "supplement"` support
- Use Pill icon and "Takviye Programı" label
- Hide difficulty/goal selects for supplement mode (same as nutrition)
- Item count label: "{n} takviye kaydedilecek"

### Technical Notes

- `supplement_template_items` uses `supplement_name` (text) rather than FK to `supplements_library` so coaches can add custom supplements
- The 3-way toggle replaces the existing binary Switch in both Dashboard and Builder headers — uses 3 styled buttons in the same `glass` container
- Assignment to athletes: iterate template items and bulk-insert into `assigned_supplements` with athlete_id + coach_id — reusing existing `useSupplementMutations`
- `ProgramData` interface extended with `type: "supplement"` and `itemCount` field
- `builderMode` and `ProgramLibrary.builderMode` prop types extended to include `"supplement"`

### File Summary

| File | Action |
|------|--------|
| `supabase/migrations/...` | NEW — 3 tables + RLS + seed |
| `src/hooks/useSupplementTemplates.ts` | NEW |
| `src/components/program-architect/SupplementBuilder.tsx` | NEW |
| `src/components/program-architect/ProgramDashboard.tsx` | MODIFY — 3-way toggle, supplement fetch/cards/actions |
| `src/pages/Programs.tsx` | MODIFY — supplement builder mode, save/edit/add logic |
| `src/components/program-architect/ProgramLibrary.tsx` | MODIFY — supplement library source |
| `src/components/program-architect/SaveTemplateDialog.tsx` | MODIFY — supplement mode support |


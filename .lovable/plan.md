

## Multi-Program & Multi-Diet Support in ActiveBlocks

### Current State
- Training: relies on single `profiles.active_program_id`, shows only one program
- Diet: relies on single `nutrition_targets.active_diet_template_id`, shows only one diet
- But `assigned_workouts` already supports multiple programs per athlete (ProgramTab uses this)
- `athlete_diet_assignments` table exists for multiple diet assignments

### Plan

**Single file change: `src/components/athlete-detail/ActiveBlocks.tsx`**

**Data Fetching Changes:**
- **Training**: Instead of reading `profiles.active_program_id`, query `assigned_workouts` for all distinct `program_id` values for the athlete, then fetch program details from `programs` table. Store as `TrainingData[]` array instead of single `TrainingData | null`.
- **Diet**: Query `athlete_diet_assignments` for all assigned templates, plus check `nutrition_targets.active_diet_template_id` for the primary one. Merge into `DietData[]` array.

**UI Changes:**
- **Multiple programs**: Render each program as a separate row inside the "Programlar" card, each with its own progress bar and "Kaldır" (remove) dropdown action.
- **No programs**: Show an "Antrenman Programı Ata" button that navigates to the Program tab or opens the assign dialog.
- **Multiple diets**: Same pattern — list each diet template vertically with "Kaldır" action.
- **No diets**: Show a "Beslenme Planı Ata" button that opens `AssignDietTemplateDialog`.
- Remove the "Değiştir" (Replace) action since multi-program makes it less relevant; keep only "Kaldır" per item and "Ata" when empty.

**Revoke Logic Changes:**
- `handleRevokeTraining(programId, programName)`: Delete future `assigned_workouts` for that specific `program_id`. If the revoked program matches `profiles.active_program_id`, clear it. Log removal.
- `handleRevokeDiet(templateId)`: Remove from `athlete_diet_assignments`. If it matches `nutrition_targets.active_diet_template_id`, clear it. 

**Detail Dialogs**: Keep existing training/diet detail dialogs, but parameterize them to show the clicked program/diet's data (pass programId/templateId as state instead of relying on single `training`/`diet` state).

```text
┌──────────────────────────────────────┐
│  Programlar                   [grip] │
│──────────────────────────────────────│
│  🏋 Push Pull Legs     Hafta 2/4  ✕ │
│  ████████░░░░  %50                   │
│──────────────────────────────────────│
│  🏋 Strength 5x5      Hafta 1/8  ✕ │
│  ██░░░░░░░░░░  %12                   │
│──────────────────────────────────────│
│  🍎 Bulk Diet Plan     Hafta 3/12 ✕ │
│  ██████░░░░░░  %25                   │
│  2800 kcal · 200g P · 350g K        │
│──────────────────────────────────────│
│             (if empty)               │
│  [+ Antrenman Programı Ata]          │
│  [+ Beslenme Planı Ata]             │
└──────────────────────────────────────┘
```

### Files
- **Modified**: `src/components/athlete-detail/ActiveBlocks.tsx` — refactor state to arrays, multi-item rendering, parameterized dialogs, add "Ata" buttons when empty


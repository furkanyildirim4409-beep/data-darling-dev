

## Replace Program Dialog -- Custom Card

### Problem
The current "Değiştir" action opens `AssignProgramDialog` which is designed for bulk assignment. It also deletes ALL future `assigned_workouts` for the athlete (regardless of program), breaking multi-program support.

### Solution
Create a new `ReplaceProgramDialog` component with:

```text
┌──────────────────────────────────────┐
│  Programı Değiştir                   │
│──────────────────────────────────────│
│  Mevcut: "Push Pull Legs"    [badge] │
│──────────────────────────────────────│
│  Yeni Program Seç:                   │
│  ┌──────────────────────────────┐    │
│  │ ○ Full Body Program          │    │
│  │ ○ Upper Lower Split          │    │
│  │ ● PPL Advanced        ✓     │    │
│  │ ○ Strength 5x5              │    │
│  └──────────────────────────────┘    │
│                                      │
│  Başlangıç: [📅 Pzt, 17 Mar]        │
│  Süre:      [▾ 4 Hafta (1 Ay)]      │
│                                      │
│  ─── Özet ───                        │
│  3 gün/hafta · 4 hafta · 12 antrenman│
│                                      │
│  [     Programı Değiştir     ]       │
└──────────────────────────────────────┘
```

### Changes

**New file: `src/components/athlete-detail/ReplaceProgramDialog.tsx`**
- Fetches all coach programs from `programs` table
- Shows them as a selectable radio list with title + description
- Date picker (Calendar + Popover, `pointer-events-auto`) defaulting to next Monday
- Duration selector (1, 4, 8, 12 weeks)
- On confirm:
  1. Delete only the OLD program's future workouts: `DELETE FROM assigned_workouts WHERE athlete_id = X AND program_id = OLD_PROGRAM_ID AND scheduled_date >= today`
  2. Log removal for old program in `program_assignment_logs`
  3. Build and insert new assignments (same modulo logic as `AssignProgramDialog`)
  4. Update `profiles.active_program_id` to new program
  5. Log assignment for new program

**Modified: `src/components/athlete-detail/ActiveBlocks.tsx`**
- Import `ReplaceProgramDialog` instead of `AssignProgramDialog`
- Pass `oldProgramId`, `athleteId`, `onComplete` props
- Remove `AssignProgramDialog` import and the replace block (lines 517-526)

### Key Architecture Difference
The critical fix is in the DELETE step. Current code:
```sql
-- CURRENT (breaks multi-program)
DELETE FROM assigned_workouts WHERE athlete_id = X AND scheduled_date >= today

-- NEW (program-scoped)  
DELETE FROM assigned_workouts WHERE athlete_id = X AND program_id = OLD_ID AND scheduled_date >= today
```

This ensures other assigned programs remain intact.


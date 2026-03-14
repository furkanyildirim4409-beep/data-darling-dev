

## Plan: Multi-Program Display + Assignment History Log

### Problem
ProgramTab only queries the single `active_program_id` from the profile. When a program is removed, the old `assigned_workouts` rows for other programs still exist in DB but are invisible. Only the latest active program is ever shown.

### Solution

#### 1. New DB Table: `program_assignment_logs`
Tracks when programs are assigned/removed for historical record.

```sql
CREATE TABLE program_assignment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  program_id uuid NOT NULL,
  program_title text NOT NULL,
  action text NOT NULL DEFAULT 'assigned', -- 'assigned' | 'removed'
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE program_assignment_logs ENABLE ROW LEVEL SECURITY;
-- Coach can manage logs for their athletes
CREATE POLICY "Coaches manage assignment logs" ON program_assignment_logs
  FOR ALL TO authenticated
  USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
-- Athletes can view own logs
CREATE POLICY "Athletes view own assignment logs" ON program_assignment_logs
  FOR SELECT TO authenticated
  USING (athlete_id = auth.uid());
```

#### 2. Rewrite `ProgramTab.tsx`
- Fetch ALL distinct `program_id`s from `assigned_workouts` for this athlete (not just active).
- Fetch program info for each.
- Render a **list of program cards** on the left/top. The `active_program_id` gets an "Aktif" badge; others get a neutral badge.
- Clicking any program card loads and shows its weekly template below.
- "Programı Kaldır" only clears `active_program_id` (does NOT delete `assigned_workouts`), and inserts a log row.
- Add a "Program Geçmişi" button that opens a dialog showing `program_assignment_logs` entries with timestamps and program details.

#### 3. Update `AssignProgramDialog.tsx`
- When assigning a program, also insert a row into `program_assignment_logs` with action `'assigned'`.

#### 4. UI Structure

```text
┌─────────────────────────────────────────────┐
│ [Program Geçmişi 📋]                        │
├─────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐           │
│ │ HYPERTROPHY  │ │ Aİ YAĞ YAKIM│           │
│ │  ✅ Aktif    │ │              │           │
│ └──────────────┘ └──────────────┘           │
├─────────────────────────────────────────────┤
│        Haftalık Şablon (selected)           │
│  Pazartesi — Push Day  [3 egzersiz]         │
│  Salı      — Pull Day  [4 egzersiz]        │
│  ...                                        │
│  [Programı Kaldır] (only for active)        │
└─────────────────────────────────────────────┘
```

**Program Geçmişi Dialog:**
- Lists all log entries chronologically with action badges (Atandı / Kaldırıldı), program title, date.
- Each entry is clickable to expand and show the exercise preview from `assigned_workouts` if data still exists.

### Files
- **Migration**: Create `program_assignment_logs` table with RLS
- **Rewrite**: `src/components/athlete-detail/ProgramTab.tsx` — multi-program list, selectable cards, history button/dialog
- **Edit**: `src/components/program-architect/AssignProgramDialog.tsx` — insert log row on assignment (~3 lines)

### Key Behavior Changes
- "Programı Kaldır" no longer deletes `assigned_workouts` rows — it only clears `active_program_id` and logs the removal. This preserves historical data.
- All assigned programs remain visible and browsable regardless of which is "active."


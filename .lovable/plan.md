

## Plan: Fixed Program List + Separate Preview Section

### What Changes
Replace the accordion pattern in `ProgramTab.tsx` with a two-section layout:

1. **Top Section (Fixed)**: All assigned programs listed as compact clickable rows (always visible). Selected program gets a highlighted border. Each row has the program title, badges, and "Kaldır" button.

2. **Bottom Section (Preview)**: When a program is clicked, its weekly template renders below the list. If no program is selected, show a prompt to select one.

### UI Structure
```text
┌─────────────────────────────────────────────┐
│ Atanmış Programlar (2)    [Program Geçmişi] │
├─────────────────────────────────────────────┤
│  ● HYPERTROPHY    Intermediate    [Kaldır]  │  ← selected (highlighted)
│  ● AI YAĞ YAKIM   Advanced       [Kaldır]  │
├─────────────────────────────────────────────┤
│        Önizleme: HYPERTROPHY                │
│  Haftalık Şablon — 4 gün                   │
│  Pazartesi — Push Day [3 egzersiz]          │
│  Salı      — Pull Day [4 egzersiz]         │
│  ...                                        │
└─────────────────────────────────────────────┘
```

### Changes to `ProgramTab.tsx` (lines 314-390)
- Remove the accordion expand/collapse wrapping from each program row
- Remove `ChevronDown`/`ChevronRight` icons from program rows
- Keep `selectedProgramId` state but only use it to highlight the row and control which preview shows below
- Move the workout preview (`WorkoutList`) out of the per-program loop into a separate section below the program list
- Clicking a program row sets `selectedProgramId` (no toggle — always selects)

### Files
- `src/components/athlete-detail/ProgramTab.tsx` — restructure lines 314-390


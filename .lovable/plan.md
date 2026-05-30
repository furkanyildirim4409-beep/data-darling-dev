# Plan — Builder layout purge + tab persistence

## 1) Remove the right-side athlete selector column

Only `WeeklySchedule` carries the athlete picker; `WorkoutBuilder`, `NutritionBuilder`, and `SupplementBuilder` have no internal athlete UI, so the surgery is contained in `src/pages/Programs.tsx`:

- Drop the `WeeklySchedule` import and the entire `{builderMode !== "supplement" && (<div className="lg:col-span-4">…</div>)}` block.
- Collapse the builder grid so the workspace fills the full width:
  - Container: `grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-220px)]` (single rule for every mode).
  - Library column: `lg:col-span-3 h-full`.
  - Builder column: `lg:col-span-9 h-full w-full` (Workout/Nutrition/Supplement).
- Leave `WeeklySchedule.tsx` on disk (no longer imported) so no other consumer breaks; no logic changes in `WorkoutBuilder`/`NutritionBuilder`/`SupplementBuilder`.

## 2) Stop the dashboard tab from snapping back to "Antrenman" after save

Root cause: after saving nutrition or supplement, `Programs.tsx` calls `setDashboardKey(k => k + 1)` together with `setViewMode("dashboard")`. The key bump force-remounts `ProgramDashboard`, which reinitialises its internal `useState<ProgramType>("exercise")` — that is the "reload to workouts tab" symptom.

Fix without any `window.location.reload`, keeping state in React:

**`src/components/program-architect/ProgramDashboard.tsx`**
- New props: `initialViewMode?: ProgramType` and `refreshToken?: number`.
- Initialise `useState<ProgramType>(initialViewMode ?? "exercise")`.
- Add `useEffect` on `initialViewMode` → `setViewMode(initialViewMode)` when it changes.
- Add `useEffect` on `[refreshToken, viewMode]` that re-runs the appropriate fetch (`fetchPrograms` / `fetchDietTemplates` / `fetchSupplementTemplatesData`) so saved data shows up without remount.

**`src/pages/Programs.tsx`**
- Replace `dashboardKey` with `lastSavedType: ProgramType | null` and `refreshToken: number`.
- Remove `key={dashboardKey}` from `<ProgramDashboard>`; pass `initialViewMode={lastSavedType ?? "exercise"}` and `refreshToken={refreshToken}`.
- In each successful save branch (exercise / nutrition / supplement) of `handleSaveProgram`:
  - `setLastSavedType(builderMode)`
  - `setRefreshToken(t => t + 1)`
  - `setViewMode("dashboard")` (unchanged)
  - Toast already fires inside each branch — keep existing single success toast (no duplicate).
- Same treatment for the supplement branch that previously called `setDashboardKey`.

Result: after saving a diet template the user lands on the dashboard with the "Beslenme" tab active and fresh data; saving a supplement template lands on "Takviye"; saving a workout lands on "Antrenman". No remounts, no reloads, sub-workspace pointer pinned to the matching tab, success toast preserved.

## Out of scope
- Edge functions, DB migrations, AI flow.
- WeeklySchedule internals (file kept untouched, just unused).
- Athlete assignment still available from the dashboard's existing assign dialogs (no functionality lost — only the inline picker mid-authoring is removed).

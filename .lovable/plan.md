# Monday Auto-Snap & Program Deletion Hardening

## 1. `AssignTrainingDialog.tsx` — Force Monday snap

- Add a `normalizeToMonday(date)` helper at module scope using the ISO rule (Sunday=0 → -6, otherwise `date - day + 1`), then zero out hours/min/sec/ms.
- Replace the date picker's `onSelect={(d) => d && setStartDate(d)}` with `onSelect={(d) => d && setStartDate(normalizeToMonday(d))}`.
- Also normalize the initial `getNextMonday()` result through the same helper for safety, and re-normalize inside `handleAssign` before computing `scheduledDate` so the persisted `scheduled_date` payload is always a Monday-anchored ISO date.
- Add a small caption under the date trigger row: `Seçilen Hafta Başlangıcı: {format(startDate, "dd MMMM yyyy", { locale: tr })} (Pazartesi)` — muted-foreground, `text-xs`, only visible when the dialog is open.

## 2. `ProgramTab.tsx` — Real destructive deletion

Current `handleRemoveProgram` already issues a `.delete()` but ignores errors and doesn't surface failures. Overhaul:

- Capture `{ error }` from the `assigned_workouts` delete call. On error: `toast.error("Antrenman silinemedi: " + error.message)`, abort, do not log removal, do not clear active program.
- Only after a successful DB delete: clear `active_program_id` (when applicable), insert the `program_assignment_logs` row, then refetch.
- Replace success toast with: `toast.success("Antrenman programı sporcu üzerinden kalıcı olarak silindi.", { icon: "🗑️" })`.
- Ensure the `setRemoving(false)` and `setRemoveOpen(false)` run in a `finally`-style cleanup so the dialog never gets stuck on error.

No schema changes. No new dependencies.

## Out of scope
- The athlete app-side cache (handled by realtime).
- React Query — this file uses local `useState`, so the refetch stays as `fetchPrograms()` rather than `queryClient.invalidateQueries`.

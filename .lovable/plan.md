## Fix: Propagate `spotify_url` from programs into `assigned_workouts`

The `programs` table holds `spotify_url`, but three assignment dialogs never SELECT or copy it when inserting rows into `assigned_workouts`, so the column is always `null`. Patch all three flows.

### A) `src/components/athlete-detail/AssignTrainingDialog.tsx`
- Extend the programs query: `.select("id, title, description, spotify_url")`.
- Add `spotifyUrl: string | null` to `ProgramOption`; map it in the `mapped` array.
- In the `rows.push({...})` block inside `handleAssign`, add `spotify_url: prog.spotifyUrl ?? null,`.

### B) `src/components/program-architect/AssignProgramDialog.tsx`
- Update the parallel fetch in `handleAssign` (line ~168): `supabase.from("programs").select("week_config, spotify_url").eq("id", programId).single()`.
- In the `payload.push({...})` block (line ~260), add `spotify_url: (program as any)?.spotify_url ?? null,`.
- (Preview-only query at line 113 untouched — it doesn't insert.)

### C) `src/components/program-architect/BulkAssignDialog.tsx`
- Update the bulk fetch (line ~192): `supabase.from("programs").select("id, week_config, spotify_url").in("id", selectedProgramIds)`.
- In the `payload.push({...})` block (line ~252), add `spotify_url: (progData as any)?.spotify_url ?? null,` (progData is already in scope per the existing `weekConfig` line).

### Out of scope
- No schema changes (column already exists).
- No UI/display changes — pure data-propagation fix.
- Existing past assignment rows remain `null`; new assignments will carry the URL going forward.
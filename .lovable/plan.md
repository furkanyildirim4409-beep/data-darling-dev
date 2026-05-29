# Re-Termination Cache Invalidation Fix

## Problem
When an athlete is terminated → reinstated → terminated again, they don't reappear in the "Feshedilen Sporcular" sheet. The `terminated-athletes` query inside `TerminatedAthletesPanel` (StoreManager.tsx) serves stale cached data and never re-validates against Supabase when the sheet is re-opened or another mutation flips `subscription_status` back to `terminated`.

## Changes — `src/pages/StoreManager.tsx`

### 1. Harden the terminated-athletes query (around line 903)
Add freshness + refetch triggers to the existing `useQuery`:
- `staleTime: 0` — always treat cache as stale
- `refetchOnWindowFocus: true`
- `refetchOnMount: "always"` — refetch each time the Sheet remounts the panel
- Keep `queryKey: ["terminated-athletes", activeCoachId]` (already scoped to coach; matches the rest of the file's conventions — no need to switch to `['athletes','terminated']` since invalidation uses prefix matching).

### 2. Refetch when the Sheet opens
Expose `refetch` from the query and trigger it whenever `terminatedSheetOpen` flips to `true`. Two options:
- Pass an `open` prop into `TerminatedAthletesPanel` and `useEffect(() => { if (open) refetch(); }, [open])`, OR
- Call `queryClient.invalidateQueries({ queryKey: ["terminated-athletes"] })` from `StoreManager` inside the `onOpenChange` handler when opening.

Going with the second approach — smaller diff, keeps the panel self-contained.

### 3. Strengthen reinstate mutation invalidation (around line 927)
Already invalidates the right keys; add an `await refetch()` after invalidation for instant UI sync (currently fire-and-forget). Convert `onSuccess` to await both `invalidateQueries` calls so the list is guaranteed fresh before the toast resolves.

## Out of scope
- No DB / RLS changes
- No edits to `useAthletes` or other panels
- Part 2 / Part 3 termination lifecycle work

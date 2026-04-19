

User wants to decouple highlight state from `expires_at`. Highlights live purely on `is_highlighted` + `category`. The active 24h ring is governed exclusively by the original `expires_at = created_at + 24h`.

Confirmed from code:
- `useUpdateStoryCategory` in `src/hooks/useSocialMutations.ts` currently sets `expires_at` to `'2099-01-01T00:00:00Z'` on highlight and recomputes `created_at + 24h` on un-highlight. Both branches must stop touching `expires_at`.
- `useCoachHighlights` already filters by `is_highlighted = true` only — no `expires_at` dependency. Good, no change needed.
- `HighlightsSection.tsx` "remove highlight" path calls the same hook with `category: null` — will naturally inherit the new behavior.
- `StoryArchiveDialog.tsx` "Aktif/Arşiv" badge is computed via `isActive(expires_at)` — once data is cleaned, archived highlighted stories will correctly show as "Arşiv" again.

## Plan

### Step A — Rewrite `useUpdateStoryCategory`
File: `src/hooks/useSocialMutations.ts`

- Drop the `existing` fetch (no longer needed).
- Highlight: `update({ is_highlighted: true, category })`.
- Un-highlight: `update({ is_highlighted: false, category: null })`.
- Never touch `expires_at` in either branch.
- Keep existing query invalidations (`coach-stories`, `coach-stories-archive`, `coach-highlights`).

### Step B — Emergency data cleanup
Run via insert tool (UPDATE on existing table, no schema change):

```sql
UPDATE public.coach_stories
SET expires_at = created_at + interval '24 hours'
WHERE expires_at > created_at + interval '30 days';
```

This snaps every story whose `expires_at` was pushed to `'2099-01-01'` (or any unrealistic far-future value) back to its true 24h window. Highlighted stories remain highlighted because `is_highlighted` is unaffected — they just stop polluting the active ring.

### Files

| File | Action |
|------|--------|
| `src/hooks/useSocialMutations.ts` | EDIT — strip `expires_at` writes from `useUpdateStoryCategory` |
| Database (no migration) | RUN UPDATE — reset corrupted `expires_at` rows |

### Confirmation
- Athlete app's 24h ring (filters `expires_at > now()`) will no longer surface archived/highlighted stories.
- Coach highlights tab continues working — driven solely by `is_highlighted`.
- No new INSERTs; no schema change; no impact on un-highlighted active stories created within the last 24h.


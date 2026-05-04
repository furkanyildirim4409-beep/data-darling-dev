# Kokpit Highlights Pinning

Add the ability for coaches to control which highlight groups appear on the athlete's Kokpit (dashboard).

## Step A — Database Migration

New migration file under `supabase/migrations/`:

```sql
ALTER TABLE public.coach_highlight_metadata
  ADD COLUMN IF NOT EXISTS is_pinned_to_kokpit boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_chm_coach_pinned
  ON public.coach_highlight_metadata (coach_id, is_pinned_to_kokpit);
```

Default `true` so existing groups stay visible (no behavior regression). Existing RLS policies on `coach_highlight_metadata` already allow the coach to update their own rows — no policy changes needed.

## Step B — Hooks (`src/hooks/useSocialMutations.ts`)

1. **`useCoachHighlights`** — extend the `coach_highlight_metadata` SELECT to include `is_pinned_to_kokpit`, and surface it on each returned group (e.g. `isPinnedToKokpit: boolean`, defaulting to `true` when no metadata row exists).
2. **`useToggleKokpitPin`** — new mutation:
   - Input: `{ categoryName: string; isPinned: boolean }`
   - Upserts `coach_highlight_metadata` for the current `coach_id` + `category_name` setting `is_pinned_to_kokpit`. Upsert (rather than update) ensures groups without a metadata row still get one created.
   - On success: `invalidateQueries(["coach-highlights"])` and any athlete-side query key used to render the kokpit highlights (will check at implementation time and add invalidation if a separate key exists).
   - Optimistic update on the cached `["coach-highlights"]` list so the toggle feels instant.

## Step C — UI (`src/components/content-studio/HighlightDetailSheet.tsx`)

- Pass `isPinnedToKokpit` through the `group` prop (already wired via `useCoachHighlights`).
- Add a `Switch` row above the "Kapak Değiştir" / "Grubu Sil" actions:
  - Label: **"Öğrenci Kokpitinde Göster"**
  - Subtext: short helper explaining it controls the athlete dashboard visibility
  - Bound to `useToggleKokpitPin`, disabled while the mutation is pending
- Toast confirms the new state.

## Step D — Athlete Kokpit consumer

Locate the athlete dashboard consumer for highlights (likely fetches `coach_stories` + `coach_highlight_metadata` for the assigned coach) and filter out groups where `is_pinned_to_kokpit = false`. Coach profile page continues to show all groups.

## Files

- New: `supabase/migrations/<ts>_chm_pin_kokpit.sql`
- Edit: `src/hooks/useSocialMutations.ts` (extend select + new `useToggleKokpitPin`)
- Edit: `src/components/content-studio/HighlightDetailSheet.tsx` (Switch UI)
- Edit: athlete kokpit highlights query (filter by `is_pinned_to_kokpit`)

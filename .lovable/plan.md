# Independent Highlight Visibility Control

Add a second visibility switch so coaches can independently control whether a Highlight Group appears on the **athlete's Cockpit** and on their **own Coach Profile**.

Current state: `coach_highlight_metadata.is_pinned_to_kokpit` already controls Cockpit visibility. We add a parallel `show_on_profile` flag.

## Step A — Database Migration

New migration `supabase/migrations/<ts>_chm_show_on_profile.sql`:

```sql
ALTER TABLE public.coach_highlight_metadata
  ADD COLUMN IF NOT EXISTS show_on_profile boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_chm_coach_show_profile
  ON public.coach_highlight_metadata (coach_id, show_on_profile);
```

Default `true` preserves current behavior. Existing RLS already allows coaches to update their own rows.

## Step B — Hook updates (`src/hooks/useSocialMutations.ts`)

Note: there is no separate `useCoachHighlights.ts` file — the hook lives in `useSocialMutations.ts`. Edits target that file.

1. Extend the `HighlightGroup` interface with `showOnProfile: boolean`.
2. In `useCoachHighlights`:
   - Add `show_on_profile` to the `coach_highlight_metadata` select.
   - Map it into `metaMap` and onto each returned group (default `true` when no metadata row exists).
3. New mutation `useToggleProfileVisibility`:
   - Input: `{ categoryName: string; showOnProfile: boolean }`
   - Upserts `coach_highlight_metadata` for current `coach_id` + `category_name`, setting `show_on_profile` (so groups without a metadata row still get one).
   - Optimistic update on `["coach-highlights", user?.id]` cache.
   - On settle: `invalidateQueries(["coach-highlights"])`.
   - Mirrors the existing `useToggleKokpitPin` pattern exactly.

## Step C — UI (`src/components/content-studio/HighlightDetailSheet.tsx`)

Add a second `Switch` row directly below the existing "Öğrenci Kokpitinde Göster" row. Both switches sit in the sheet header so it's visually clear they are independent.

```text
┌─────────────────────────────────────────────┐
│ Öğrenci Kokpitinde Göster        [ ●  ]    │
│ Kapalıyken bu grup yalnızca profilinde…    │
├─────────────────────────────────────────────┤
│ Profilde Göster                  [ ●  ]    │
│ Kapalıyken bu grup koç profilinde gizlenir.│
└─────────────────────────────────────────────┘
```

- Label: **"Profilde Göster"**
- Helper text: "Kapalıyken bu grup koç profilinde gizlenir."
- Bound to `useToggleProfileVisibility`, disabled while pending.
- Reads `group.showOnProfile`.

Both switches are fully independent — turning one off does not affect the other. A group can be: visible everywhere, only on cockpit, only on profile, or hidden from both (still accessible via Content Studio for management).

## Step D — Profile consumer filtering

The coach profile / public profile renderer that lists highlight groups should filter out groups where `show_on_profile = false`. I'll grep for the consumer at implementation time (likely a public coach profile page that queries `coach_highlight_metadata`) and add the filter. The Content Studio management view continues to show all groups regardless of either flag.

## Visibility Logic Summary

| `is_pinned_to_kokpit` | `show_on_profile` | Athlete Cockpit | Coach Profile | Content Studio |
|----------------------|-------------------|-----------------|---------------|----------------|
| true                 | true              | ✓               | ✓             | ✓              |
| true                 | false             | ✓               | ✗             | ✓              |
| false                | true              | ✗               | ✓             | ✓              |
| false                | false             | ✗               | ✗             | ✓              |

## Files

- New: `supabase/migrations/<ts>_chm_show_on_profile.sql`
- Edit: `src/hooks/useSocialMutations.ts` — extend `HighlightGroup`, extend select, add `useToggleProfileVisibility`
- Edit: `src/components/content-studio/HighlightDetailSheet.tsx` — second `Switch` row
- Edit: coach profile highlights consumer (located at implementation time) — filter by `show_on_profile`

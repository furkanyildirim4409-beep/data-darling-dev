## Highlights Manager — Part 8

Coach OS already has a working Highlights backbone (`coach_stories` with `category` + `is_highlighted`, `coach_highlight_metadata` for custom covers). The user picked **Option A — extend, do not duplicate**. So no parallel `coach_highlights` / `coach_stories` tables and no new `highlights` bucket. We reuse `social-media`.

This part fills the UX gaps: a true "Create Highlight Group" flow, a polished group-detail panel with thumbnails + per-story delete + in-group dropzone, and per-group ordering.

### Step A — Database (single small migration)

Add `order_index` to `coach_highlight_metadata` so the Manager controls highlight order deterministically. Backfill = current `created_at` rank.

```sql
alter table public.coach_highlight_metadata
  add column if not exists order_index integer not null default 0;

-- Backfill existing rows by created_at order per coach
with ranked as (
  select id,
         row_number() over (partition by coach_id order by created_at) - 1 as rn
  from public.coach_highlight_metadata
)
update public.coach_highlight_metadata m
set order_index = r.rn
from ranked r
where r.id = m.id;

create index if not exists idx_chm_coach_order
  on public.coach_highlight_metadata (coach_id, order_index);
```

No changes to `coach_stories`, RLS, or buckets. The `social-media` bucket already exists and is correctly scoped (`auth.uid()` folder). The Student App fetcher continues working unchanged.

### Step B — Hooks: extend `src/hooks/useSocialMutations.ts`

All new logic lives in the existing file to keep one source of truth. Additions:

1. **`useCoachHighlights`** — extend `select` on `coach_highlight_metadata` to include `order_index`; sort the returned `groups` by `order_index` (groups missing metadata fall to the end alphabetically).
2. **`useCreateHighlightGroup({ name, coverFile })`** —
   - Upload `coverFile` to `social-media/{user.id}/highlight-covers/{ts}.{ext}` → `getPublicUrl`.
   - `upsert coach_highlight_metadata { coach_id, category_name: name, custom_cover_url: url, order_index: max+1 }`.
   - Toast + invalidate `coach-highlights`.
3. **`useDeleteHighlightGroup(name)`** —
   - Update all `coach_stories` where `coach_id = me AND category = name` → set `is_highlighted=false, category=null` (mirrors the existing "Kaldır" loop in `HighlightsSection`, but as a single bulk update).
   - Delete the `coach_highlight_metadata` row.
   - Invalidate.
4. **`useAddStoriesToHighlight({ category, files })`** —
   - For each file: upload to `social-media/{user.id}/{ts}-{i}.{ext}`, then `insert coach_stories { coach_id, media_url, category, is_highlighted: true, expires_at: null }` (highlighted stories don't expire — confirmed by existing schema where `is_highlighted` decouples from `expires_at`).
   - Surfaces a single aggregate toast on completion.
5. **`useDeleteStoryFromHighlight(storyId)`** —
   - `update coach_stories { is_highlighted: false }` (keeps the row in archive instead of hard-deleting; consistent with existing "Kaldır" semantics).
6. **`useReorderHighlights(orderedNames[])`** —
   - For each name: `upsert { coach_id, category_name, order_index: idx }` with `onConflict: 'coach_id,category_name'`. Used later for drag-reorder; we wire the mutation now even if drag UI ships in a follow-up.

### Step C — UI: Polished Manager

Two additions, no rewrite of `HighlightsSection`:

#### C.1 — `src/components/content-studio/CreateHighlightGroupDialog.tsx` (new)

- Inputs: `title` (text, required, max 24 chars), `coverFile` (image-only dropzone with live preview).
- Submit → `useCreateHighlightGroup`. The new group appears empty; coach then opens it to add stories.
- Reused `Dialog` + `Label` + `Input` primitives.

#### C.2 — `src/components/content-studio/HighlightDetailSheet.tsx` (new)

A right-side `Sheet` (Radix) that opens when a coach clicks a highlight in `HighlightsSection` (or the new "Yönet" button on the selected group). Shows:

- Header: cover, title, story count, "Kapak Değiştir" (reuses existing `HighlightCoverCropper`), "Grubu Sil" (uses `useDeleteHighlightGroup` with confirm).
- Dropzone (multi-file image/video) → `useAddStoriesToHighlight` with progress.
- Grid of existing stories (3 cols, native overflow): each tile shows the media, hover `X` button → `useDeleteStoryFromHighlight`. Video tiles show a `Play` overlay.
- Empty state when group has 0 stories: "Bu gruba henüz hikaye eklenmedi — yukarıdan yükleyin."

#### C.3 — `HighlightsSection.tsx` wiring (minimal edits)

- Replace the "Arşivden Seç" tile with **"+ Yeni Grup"** that opens `CreateHighlightGroupDialog`. Keep "Arşivden Seç" as a secondary smaller button below the row so the existing archive-promotion flow stays.
- Clicking a highlight tile now opens `HighlightDetailSheet` (instead of just toggling the inline accordion). The inline `selectedGroup` block is removed; all management lives in the Sheet.

#### C.4 — `ContentStudio.tsx`

No structural change. `HighlightsSection` already renders here. Just confirms the page picks up the new Manager UX automatically.

### Files

| File | Action |
|---|---|
| `supabase/migrations/<ts>_chm_order_index.sql` | Create — adds `order_index` + backfill + index |
| `src/hooks/useSocialMutations.ts` | Edit — add 5 new hooks, extend `useCoachHighlights` |
| `src/components/content-studio/CreateHighlightGroupDialog.tsx` | Create |
| `src/components/content-studio/HighlightDetailSheet.tsx` | Create |
| `src/components/content-studio/HighlightsSection.tsx` | Edit — swap inline accordion → Sheet, add "+ Yeni Grup" |

### Out of Scope

- Drag-to-reorder UI (mutation is wired; UI in a follow-up).
- Migrating story media into a separate `highlights` bucket. Reusing `social-media` keeps backward compatibility with existing rows whose URLs already point there.
- Modifying the Student App fetcher — it consumes the same `coach_stories` rows and now gets ordered groups for free.

### Acceptance

1. "+ Yeni Grup" creates an empty highlight with cover; appears immediately in the row.
2. Clicking a highlight opens the Sheet; uploaded files appear as story tiles instantly with realtime invalidation.
3. Per-story `X` removes the tile (`is_highlighted=false`), story falls back into Archive.
4. "Grubu Sil" un-highlights all member stories and deletes the metadata row.
5. Custom cover replacement still works through the existing `HighlightCoverCropper`.
6. Highlights render in `order_index` order across page reloads.

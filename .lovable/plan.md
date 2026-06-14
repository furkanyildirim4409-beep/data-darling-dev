# Academy Studio Overhaul — Part 1/5

## Schema reality check
The spec references `academy_courses` and `academy_modules`, but this project stores everything in a single table `public.academy_content` with a JSONB `modules` array (no separate modules table). I will adapt the migration to that real schema while preserving the spec's intent.

## 1. Database migration
Add to `public.academy_content`:
- `visibility text NOT NULL DEFAULT 'public'` — values: `public` | `students_only`
- `status text NOT NULL DEFAULT 'published'` — values: `published` | `draft` | `archived`

Module-level fields live inside the existing JSONB `modules` array (no DDL needed). Each module object will gain:
- `content_type`: `'video' | 'article'` (default `'video'`)
- `article_content`: rich-text HTML (only when `content_type='article'`)

RLS on `academy_content` already exists (3 policies) — no policy changes needed; new columns inherit them.

## 2. UI: replace Sheet with full-screen Dialog
File: `src/pages/Akademi.tsx`

- Remove the `<Sheet>` wrapper (lines ~489–693) and replace with `<Dialog>` from `@/components/ui/dialog` using a custom `DialogContent` className: `max-w-[1200px] w-[95vw] h-[92vh] p-0 flex flex-col` so the workspace fills the screen.
- Header / scrollable body / sticky footer layout preserved (header, `flex-1 overflow-y-auto` body, footer).
- Promote "Ana Başlık" and "Detaylı Açıklama" as the top hero block with larger inputs.

## 3. New form controls
- **Visibility select** (`visibility` state) bound to new column: "Herkese Açık" / "Yalnızca Öğrencilerime".
- **Status select** (`status` state): "Yayında" / "Taslak" / "Arşivli" (default `published`).
- Module card additions:
  - Segmented toggle `content_type`: **Video** | **Makale**.
  - Video branch: existing video URL / upload field.
  - Article branch: render `RichTextEditor` (reuse `src/components/mailbox/RichTextEditor.tsx`) bound to `article_content`; hide video controls.

## 4. Submit handler updates
- Persist top-level `visibility` and `status` to `academy_content` insert/update payload.
- For each module in the JSONB array, include `content_type` and (when article) `article_content`; skip video upload step for article modules.
- Edit flow: hydrate new fields from existing row when opening the modal.

## 5. Card display
Course list cards (`src/pages/Akademi.tsx` renderer) get small badges:
- Visibility chip (Public / Students Only)
- Status chip (Draft / Archived only — published stays unbadged)

## Technical notes
- Types in `src/integrations/supabase/types.ts` regenerate after migration runs.
- Local `CourseModuleLocal` type extends with `contentType: 'video'|'article'` and `articleContent: string`.
- No changes to `academy-videos` storage bucket; article modules don't upload anything.
- Parts 2–5 of the launch prep series are out of scope for this plan.

## Files touched
- `supabase/migrations/<new>.sql` — add `visibility`, `status` columns
- `src/pages/Akademi.tsx` — Sheet → Dialog, new fields, article editor, badges

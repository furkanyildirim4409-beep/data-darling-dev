

## Academy to Course/LMS Evolution (Epic 4.5)

### Overview

Transform the single-URL academy system into a multi-module course builder. Add a `modules` JSONB column to the DB, create an `academy-videos` storage bucket, and replace the Dialog with a right-side Sheet for spacious course editing.

### Changes

| Step | What |
|------|------|
| **Migration 1** | Add `modules` JSONB column to `academy_content` |
| **Migration 2** | Create `academy-videos` storage bucket + RLS |
| **Akademi.tsx** | Replace Dialog with Sheet, add modules builder, video upload per module |

### 1. Migration — `modules` column

```sql
ALTER TABLE public.academy_content
  ADD COLUMN modules jsonb NOT NULL DEFAULT '[]'::jsonb;
```

Modules structure stored as JSON array: `[{ id, title, videoUrl, fileName, duration, order }]`. No separate table needed — modules are tightly coupled to their parent course.

### 2. Migration — `academy-videos` bucket

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('academy-videos', 'academy-videos', true);

CREATE POLICY "Coaches upload academy videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'academy-videos');

CREATE POLICY "Anyone can view academy videos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'academy-videos');

CREATE POLICY "Coaches delete own academy videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'academy-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
```

### 3. `Akademi.tsx` — Course Builder overhaul

**Replace Dialog with Sheet (side="right"):**
- Use `Sheet` / `SheetContent` with `side="right"` and class `sm:max-w-2xl w-full`
- Full-height scrollable content area for building multi-module courses

**Module state:**
- New interface: `CourseModule { id: string; title: string; videoFile: File | null; videoUrl: string; fileName: string; order: number }`
- State: `modules: CourseModule[]` — managed locally in the form
- Button "+ Yeni Bölüm Ekle" appends a new empty module

**Module list UI:**
- Each module row: ordered number badge, title Input, video upload zone (accepts `video/mp4,video/quicktime`, max 500MB), file name display, Trash2 delete button
- Video upload zone per module: dashed border box showing `UploadCloud` + "Video yükleyin" or the selected file name + size
- Hidden `<input type="file" accept="video/mp4,video/quicktime">` per module triggered on click

**Submit flow:**
1. Upload thumbnail (existing logic)
2. Upload each module's video file to `academy-videos/{coachId}/{timestamp}_{moduleOrder}.{ext}`, collect public URLs
3. Build modules JSON array with the uploaded URLs
4. Insert into `academy_content` with the `modules` column populated
5. Remove the old "Medya Linki" Input entirely — modules replace it

**Card updates:**
- Show module count badge on cards: e.g., "3 Bölüm" badge next to category/type badges
- Keep existing card layout, just add the module count indicator

**Data mapping:**
- Fetch: parse `row.modules` (already JSON from Supabase) into the local modules array
- AcademyItem interface gains `modules: { id: string; title: string; videoUrl: string; fileName: string; order: number }[]`




## Academy Content Studio Final Polish (Epic 4 - Prompt 3/3)

### Overview

Three changes to `Akademi.tsx`: image upload for thumbnails, video play overlay on cards, and improved empty state. Plus a storage bucket migration.

### Changes

| Step | What |
|------|------|
| **Migration** | Create `academy-thumbnails` public storage bucket + RLS policies |
| **Akademi.tsx** | Replace thumbnail URL input with drag-and-drop uploader, add video overlay, polish empty state and card hover |

### 1. Migration -- `academy-thumbnails` bucket

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('academy-thumbnails', 'academy-thumbnails', true);

CREATE POLICY "Coaches upload academy thumbnails"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'academy-thumbnails');

CREATE POLICY "Anyone can view academy thumbnails"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'academy-thumbnails');

CREATE POLICY "Coaches delete own academy thumbnails"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'academy-thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);
```

### 2. `Akademi.tsx` changes

**New state & refs:**
- `thumbnailFile: File | null` state for preview
- `thumbnailPreview: string` state (via `URL.createObjectURL`)
- `isUploadingThumbnail: boolean` state
- Hidden `<input type="file" ref={fileInputRef} accept="image/*" />`

**New imports:**
- `UploadCloud`, `PlayCircle`, `X`, `ImageIcon` from lucide-react
- `useRef` from react

**Thumbnail upload zone (replaces lines 327-329):**
- Dashed border container: `border-dashed border-2 border-border rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors min-h-[120px]`
- If `thumbnailPreview` or `form.thumbnail` exists: show image preview with an X button to clear
- Otherwise: show `UploadCloud` icon + "Görsel yüklemek için tıklayın" text
- On click: trigger hidden file input
- On file select: set `thumbnailFile`, generate preview via `URL.createObjectURL`
- On form submit: if `thumbnailFile` exists, upload to `academy-thumbnails/{coachId}/{timestamp}.{ext}`, get public URL, use as `thumbnail` value in the insert

**Card thumbnail area (lines 226-234):**
- When `item.thumbnail` exists, wrap img in `relative overflow-hidden` container
- Add `group-hover:scale-105 transition-transform duration-500` to the `<img>`
- If `item.type === 'Video'` AND `item.thumbnail` exists: overlay a `PlayCircle` icon centered absolutely (`absolute inset-0 flex items-center justify-center`) with `text-white/80 w-10 h-10 drop-shadow-lg`

**Empty state (lines 281-286):**
- Replace `Search` icon with `GraduationCap` at `w-16 h-16 opacity-20`
- Add subtitle: "Filtreleri değiştirmeyi veya yeni içerik eklemeyi deneyin"
- Distinguish between "no items at all" (show welcome message + add button) vs "no filter results"

**Card container hover:**
- Already has `hover:border-primary/30`; update to `hover:border-primary/50`

**Dialog reset:**
- Clear `thumbnailFile` and `thumbnailPreview` when dialog closes or form submits


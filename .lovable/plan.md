## Plan: Native MP4 + Image Uploader for Coaching Packages

### 1. Database migration (Supabase Storage)
Create a single migration that:
- Inserts public bucket `coaching-packages` (idempotent via `ON CONFLICT`).
- Adds storage.objects policies:
  - `INSERT` for `authenticated` where `bucket_id = 'coaching-packages'`.
  - `SELECT` for `public` where `bucket_id = 'coaching-packages'`.
  - Also `UPDATE` + `DELETE` for `authenticated` on own uploads (so coaches can replace/remove their assets — required for a clean UX even though the brief only listed insert/select).
- Guards with `DROP POLICY IF EXISTS` to keep the migration re-runnable.

### 2. Refactor `src/components/business/PackageFormDialog.tsx`
Replace the two text inputs in SECTION B — MEDIA with native upload widgets.

**State / handlers**
- Add `videoUploading: boolean`, `videoProgress: number`, `galleryUploading: Record<number, boolean>`.
- Add async `handleMediaUpload(file, type, slotIndex?)` that:
  - Validates MIME (`video/mp4`, `video/quicktime` for video; `image/*` for gallery) and size (video ≤ 200 MB, image ≤ 8 MB).
  - Generates `package-assets/${crypto.randomUUID()}.${ext}`.
  - Calls `supabase.storage.from('coaching-packages').upload(path, file, { cacheControl: '31536000', upsert: false })`.
  - On success resolves `getPublicUrl` and writes back into `videoUrl` or the targeted `galleryUrls[idx]`.
  - On failure shows `toast.error`.
- Add `handleRemoveVideo` and reuse existing `removeGallerySlot` for clearing.

**UI — Video block**
- Dark glass dropzone: `rounded-xl border border-dashed border-white/10 bg-white/[0.01] hover:border-primary/40 transition` with drag-and-drop handlers.
- Empty state: upload icon + "MP4 dosyasını sürükleyin veya seçin" + size hint.
- Uploading state: animated `Progress` bar + percent.
- Filled state: inline `<video controls>` preview + "Değiştir" / "Kaldır" buttons.

**UI — Gallery block**
- Same dropzone treatment per slot. Slot shows thumbnail when filled, dropzone when empty.
- "Slot ekle" button preserved; cap at `MAX_GALLERY`.
- Keep submit payload shape (`video_url`, `gallery_urls`) untouched — only the URL source changes from manual paste to CDN URL from Storage.

**Submission**
- Block `onSubmit` while any upload is in-flight (`videoUploading || any galleryUploading`).
- No change to `video_url` / `gallery_urls` columns — they continue to store the public CDN URL string.

### 3. Out of scope (handled in later parts)
- Video transcoding, thumbnails, signed URLs, per-coach folder scoping, deletion of orphaned storage objects on package delete.

### Technical notes
- Bucket is public, so `getPublicUrl` is sufficient and the rendered `<video>` / `<img>` need no signed URL refresh.
- The `upload` API does not expose granular progress in supabase-js v2; show an indeterminate shimmer + a coarse 0→90→100 transition driven by `onUploadProgress` via `fetch` fallback only if needed. Initial implementation uses indeterminate `Progress` to avoid extra complexity.
- Keep existing `Input`-driven flow removed entirely — no hidden fallback text field.

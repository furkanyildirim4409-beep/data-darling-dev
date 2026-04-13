

## Wire Mutations into Content Studio UI

### Summary
Connect the existing `useCreateStory` and `useCreatePost` mutation hooks to the `StoryUploadModal` and `FeedPlanner` components, replacing mock/local-only logic with real Supabase persistence. A new public storage bucket is needed for social media files.

### 1. Database Migration: Create Storage Bucket

Create a public `social-media` storage bucket for story and post images/videos, with RLS policies allowing authenticated coaches to upload and public read access.

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('social-media', 'social-media', true);

CREATE POLICY "Authenticated users can upload social media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'social-media');

CREATE POLICY "Public read access for social media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'social-media');

CREATE POLICY "Users can delete own social media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'social-media' AND (storage.foldername(name))[1] = auth.uid()::text);
```

### 2. Modify `StoryUploadModal.tsx`

- Import `useCreateStory` from `@/hooks/useSocialMutations` and `useAuth` from `@/contexts/AuthContext`
- Import `supabase` for storage upload
- Replace `onUpload` prop usage with real flow:
  1. Upload the selected file to `social-media/{userId}/{timestamp}.{ext}` via Supabase storage
  2. Get the public URL
  3. Call `createStory({ media_url: publicUrl, duration_hours: 24 })`
- Keep the `onUpload` callback so `HighlightsSection` can still update its local highlight count
- Add `isCreatingStory` / `isUploading` state to disable the submit button and show "Paylaşılıyor..."
- Switch toast import from legacy `@/hooks/use-toast` to `sonner` (mutations already use sonner)
- Wrap in try/catch

### 3. Modify `FeedPlanner.tsx`

- Import `useCreatePost` from `@/hooks/useSocialMutations` and `useAuth`
- Import `supabase` for storage upload
- Add a file input ref and state for the selected image file in the create dialog
- Update `handleCreatePost`:
  1. If a file is selected, upload to `social-media/{userId}/{timestamp}.{ext}`
  2. Get public URL
  3. Call `createPost({ type: 'text', content: newCaption })` — image URL can be stored in content or as a future column extension
  4. On success, also prepend to local `posts` state so the grid updates immediately
- Bind `isCreatingPost` to the "Oluştur" button's disabled state
- Switch toast import to `sonner`
- Wrap in try/catch

### 4. Modify `HighlightsSection.tsx`

- No changes needed — `handleStoryUpload` still receives the callback from `StoryUploadModal` for local highlight count updates

### Technical Details

- File upload path pattern: `social-media/{userId}/{Date.now()}.{ext}`
- Public URL retrieval: `supabase.storage.from('social-media').getPublicUrl(path).data.publicUrl`
- Both components get `user.id` from `useAuth()` for the upload path
- The `FeedPlanner` create dialog currently has no working file input — we wire the existing dashed upload zone to an actual `<input type="file">` with a ref

### Files
| File | Action |
|------|--------|
| Migration SQL | NEW — create `social-media` storage bucket + policies |
| `src/components/content-studio/StoryUploadModal.tsx` | MODIFY — wire `useCreateStory`, add storage upload |
| `src/components/content-studio/FeedPlanner.tsx` | MODIFY — wire `useCreatePost`, add file upload, storage upload |


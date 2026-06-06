# Story Template Builder — Production Overhaul (Part 2/3)

Fixes the broken modal layout, adds a redirect-link tool, and turns "Save Template" into a one-click publisher that pushes the canvas straight to the live 24h stories pipeline (same path as `StoryUploadModal`).

## 1. Layout & scroll fix (`StoryTemplateBuilder.tsx`)

Current modal uses `h-[90vh]` + nested `flex h-full` with a fixed-width 320px sidebar and a non-scrollable preview pane. On laptops it overflows the viewport and the preview gets cut off.

Changes:
- `DialogContent`: switch to `max-w-5xl w-[95vw] h-[90vh] max-h-[90vh] p-0 overflow-hidden flex flex-col`.
- Replace outer `<div className="flex h-full">` with a responsive wrapper:
  `flex flex-col md:flex-row h-full w-full max-h-[85vh] overflow-y-auto md:overflow-hidden`.
- Left controls panel: `w-full md:w-80 md:border-r border-b md:border-b-0` + keep internal `ScrollArea` so tools scroll independently on desktop. On mobile the whole modal scrolls vertically (controls, then preview).
- Right preview panel: `flex-1 overflow-y-auto` with the phone frame centered via `min-h-full flex items-center justify-center p-4 md:p-8`. Scale phone frame down on mobile (`w-[220px] h-[390px] md:w-[270px] md:h-[480px]`).
- Title header stays sticky inside the left panel (already inside `DialogHeader`).

Result: zero clipping at 100% zoom, controls and preview scroll independently on desktop, stacked + scrollable on mobile.

## 2. Redirect-link tool

Add a new control block inside the left panel scroll area, between "Animasyon Efekti" and "Logo Göster":

```
🔗 Yönlendirme Linki (Swipe Up)
[ https://... ] input
```

- New state: `const [linkUrl, setLinkUrl] = useState("");`
- Light client validation: trim + warn (toast) if non-empty and `URL` constructor throws.
- The value is passed into the publish payload and the swipe-up indicator text changes to "Bağlantıya kaydır" when a link is set (purely visual hint in the preview).

Typography pass on the controls panel: tighten label spacing (`space-y-2`), add subtle section dividers (`border-t border-border/50 pt-4`) between blocks, swap raw labels to `text-xs uppercase tracking-wider text-muted-foreground` so it reads like a premium SaaS editor.

## 3. "Share" routing — publish to live stories

Rename action button (line 433–436) to **🚀 Hikayeyi Paylaş** and rewire `onClick` to publish via the exact same pipeline as `StoryUploadModal.handleUpload`:

1. Snapshot the preview phone-screen DOM node to a PNG blob.
   - Add dependency `html-to-image` (lightweight, no canvas-taint issues with same-origin images).
   - `ref` on the inner `.rounded-[26px]` screen div; call `toBlob(node, { pixelRatio: 4, cacheBust: true })` to produce a ~1080×1920 PNG.
   - If the background is a user-uploaded `blob:` URL it's same-origin and renders fine. For the default Unsplash fallback we proxy via `crossOrigin` skip — acceptable since coaches typically upload their own background before sharing.
2. Upload to `social-media` bucket: `path = ${user.id}/${Date.now()}.png`, `supabase.storage.from("social-media").upload(path, blob)` then `getPublicUrl`.
3. Call `useCreateStory` mutation with `{ media_url, duration_hours: 24, category: undefined, link_url: linkUrl || undefined }`.
4. On success: `toast.success`, close the modal, invalidate `coach-stories` (already done by the mutation).

Button shows a spinner + "Paylaşılıyor..." while in-flight (`isUploading || isCreatingStory`).
Keep `Önizlemeyi Yenile` as a secondary action.

## 4. Database — add `link_url` to stories

`coach_stories` currently has no `link_url` column. Migration:

```sql
ALTER TABLE public.coach_stories ADD COLUMN link_url text;
```

No RLS changes needed (existing policies cover the column).

Then extend `CreateStoryPayload` in `useSocialMutations.ts` with optional `link_url?: string` and include it in the `.insert(...)` payload. This same field will be consumed by `StoryUploadModal` later if desired (out of scope for this part — only the type is widened).

## 5. Files touched

- `supabase/migrations/<new>.sql` — add `link_url` column
- `src/hooks/useSocialMutations.ts` — widen `CreateStoryPayload` + insert payload
- `src/components/content-studio/StoryTemplateBuilder.tsx` — layout fix, link input, share wiring
- `package.json` — add `html-to-image`

## Technical notes

- `html-to-image` is ~15KB gzipped and works inside React with refs; no DOM walking needed by us.
- We capture the existing live preview node (already styled at 270×480) and upscale via `pixelRatio: 4` → ~1080×1920, matching Instagram story spec without re-rendering at full resolution.
- Animated overlays (`animate-pulse`, etc.) snapshot at their current frame — acceptable since stories are static images.
- Video backgrounds: if `isBackgroundVideo`, we capture the current frame painted in the `<video>` element (same-origin blob URL → works).
- Out of scope: changing `StoryUploadModal`, highlights logic, or Part 1 fixes.

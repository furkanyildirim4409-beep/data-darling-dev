## Rich Package Editor (Part 3/4)

Two files: `src/hooks/useCoachPackages.ts`, `src/components/business/PackageFormDialog.tsx`. Note the actual path is `business/`, not `store/` — same file.

### 1. `useCoachPackages.ts` — extend types + persistence

- Add to `CoachingPackage`: `rich_description: string | null`, `video_url: string | null`, `gallery_urls: string[]`, `features_list: string[]`.
- Add same optional fields (arrays default `[]`) to `PackageInput`.
- In the post-fetch `.map()`, hydrate `gallery_urls` and `features_list` to arrays when missing.
- In `createPackage` / `updatePackage` insert/update payloads, include `rich_description`, `video_url`, `gallery_urls`, `features_list`.
- Keep legacy `features` column untouched (mirror `features_list` into it for backward compatibility so existing displays keep working).

### 2. `PackageFormDialog.tsx` — luxury builder layout

- Widen dialog to `max-w-3xl`.
- New state: `richDescription`, `videoUrl`, `galleryUrls: string[]` (capped at 4), `showPreview: boolean`.
- Hydrate from `initialPackage` in the existing `useEffect`.
- **Section A — Rich text:**
  - Replace short `Açıklama` textarea with a taller `Textarea` (rows 8) labeled "Zengin Açıklama (HTML destekli)" with a small inline toolbar of buttons that wrap selection with `<b>`, `<i>`, `<h3>`, `<ul><li>`, `<br/>` (simple `document.execCommand`-free helpers using selectionStart/End).
  - Toggle button "Önizleme" that swaps the textarea for a read-only `dangerouslySetInnerHTML` panel inside a `.prose prose-invert max-w-none` styled container.
- **Section B — Media:**
  - Video URL input labeled "Pazarlama / Tanıtım Videosu Linki (YouTube/Vimeo Embed)" with placeholder `https://www.youtube.com/embed/...`.
  - Gallery: 4 stacked URL inputs in a 2-column grid, each row showing a tiny thumbnail preview when URL is set; add/remove via inline trash button (max 4).
- **Section C — Features list** (renamed to "Öğrenci Avantajları"):
  - Reuse the existing chip pattern but rename state `features` → `featuresList`, store via `features_list`. Keep current "type then Enter / + button → pill with X" UX, restyled with a subtle neon ring (`shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]`).
- `handleSubmit` passes the 4 new fields to `onSubmit`; also keeps `features: featuresList` for backward compat.

### Out of scope
- No DB changes (columns already exist from Part 1).
- No edits to athlete-facing package display or `SmartContract.tsx` (Part 4 territory).
- No file-upload pipeline — gallery accepts URLs only, matching the schema (`gallery_urls TEXT[]`).
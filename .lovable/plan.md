

# Pro Tier ExerciseDB Import — Full Rewrite

## Summary
Rewrite the exercise import pipeline to leverage ExerciseDB Pro tier: fetch all 1300+ exercises in one call (`limit=0`), construct image URLs server-side using the `/image` endpoint, and bulk insert with deduplication.

## Changes

### 1. Edge Function: `supabase/functions/fetch-exercises/index.ts`
- Remove `limit` parameter from request body — no longer needed
- Change fetch URL to `limit=0&offset=0` (Pro tier returns entire DB)
- After fetching, enrich each exercise with a constructed `imageUrl` field server-side:
  ```
  imageUrl = `https://exercisedb.p.rapidapi.com/image/${ex.id}?rapidapi-key=${apiKey}`
  ```
  This keeps the API key secure (never sent to the client).
- Log the count of fetched exercises for debugging

### 2. Frontend: `ExerciseLibraryEditor.tsx` — `handleImport` function
- Remove `importLimit` state and the limit input UI (no longer relevant — we always fetch all)
- Simplify the edge function call: `supabase.functions.invoke("fetch-exercises", { body: {} })`
- Update the mapping to use the new `imageUrl` field from the edge function response:
  ```typescript
  const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  
  const mappedExercises = data.map((ex: any) => ({
    name: capitalize(ex.name || "Bilinmeyen"),
    category: capitalize(ex.bodyPart || "Diğer"),
    target_muscle: capitalize(ex.target || ""),
    video_url: ex.imageUrl || null,  // constructed by edge function
  }));
  ```
- Deduplicate against existing DB names (existing logic, unchanged)
- Chunked insert in batches of 500 (existing logic, unchanged)
- Toast: `✅ ${insertedCount} Egzersiz Eklendi (${skipped} kopya atlandı)`
- Remove the nested import dialog's limit input field and simplify the UI to a single "Tümünü Çek" button

### 3. UI Cleanup in Import Dialog
- Remove the limit number input and its label
- Update button text from "Verileri Çek ve Kaydet" to "Tüm Egzersizleri Çek (Pro)"
- Keep the import result display area

## Security
- API key stays in Supabase secrets, only used server-side in the edge function
- Image URLs include the key as a query param (required by ExerciseDB `/image` endpoint) — these URLs are stored in the DB and rendered in `<img>` tags

## Files Modified
1. `supabase/functions/fetch-exercises/index.ts` — Pro tier fetch + image URL construction
2. `src/components/program-architect/ExerciseLibraryEditor.tsx` — Updated import logic + simplified UI


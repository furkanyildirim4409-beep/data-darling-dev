

## Wire Store Mutations into Store Manager UI

### Summary
Replace the mock-only product creation in `StoreManager.tsx` with live Supabase persistence using the existing `useCreateProduct` hook. Add a `useCoachProducts` query hook to fetch real products alongside the mock data. Add an image upload field to `ProductEditor.tsx`.

### 1. Add `useCoachProducts` query to `useStoreMutations.ts`

Add a new exported hook that fetches the coach's products from `coach_products` filtered by `coach_id = user.id`. Returns `useQuery` with key `["coach-products"]`.

### 2. Modify `ProductEditor.tsx`

- Add a file input (hidden, triggered by a dashed upload zone) for product image
- Store `selectedFile` in local state
- Pass `selectedFile` up via the `onSave` callback or a new prop
- Add `isSubmitting` prop to disable the save button externally
- Show "Ürün Ekleniyor..." text when submitting

### 3. Modify `StoreManager.tsx`

- Import `useCreateProduct` and `useCoachProducts` from `@/hooks/useStoreMutations`
- Import `useAuth` and `supabase` for storage upload
- Switch toast import from `@/hooks/use-toast` to `sonner`
- Fetch live products via `useCoachProducts()` and merge with mock data (or replace mocks)
- Update `handleSaveProduct` for new products:
  1. If image file exists, upload to `social-media/{userId}/{timestamp}.{ext}`
  2. Get public URL
  3. Call `createProduct({ title, description, price, image_url, is_active: true })`
  4. On success, reset form state
- Bind `isPending` to editor's submit button
- Keep existing mock products as fallback/demo data alongside live products

### Files
| File | Action |
|------|--------|
| `src/hooks/useStoreMutations.ts` | MODIFY — add `useCoachProducts` query hook |
| `src/components/store-manager/ProductEditor.tsx` | MODIFY — add image upload field, `isSubmitting` prop |
| `src/pages/StoreManager.tsx` | MODIFY — wire mutations, fetch live data, storage upload |




## React Query Mutation Hooks for Coach Panel

### Summary
Create two new hook files for data mutations — social/story content and store products — following the existing `useMutation` + `useQueryClient` pattern used throughout the codebase.

### File 1: `src/hooks/useSocialMutations.ts`

**`useCreatePost()`**
- `useMutation` inserting into `social_posts`
- Payload: `{ content?, type, before_image_url?, after_image_url?, video_url?, video_thumbnail_url? }`
- Auto-sets `coach_id` from `useAuth().user.id`
- `onSuccess`: invalidates `["social-posts"]` query key
- Returns toast on success/error

**`useCreateStory()`**
- `useMutation` inserting into `coach_stories`
- Payload: `{ media_url, duration_hours }`
- Computes `expires_at` as `new Date(Date.now() + duration_hours * 3600000).toISOString()`
- Auto-sets `coach_id`
- `onSuccess`: invalidates `["coach-stories"]` query key

### File 2: `src/hooks/useStoreMutations.ts`

**`useCreateProduct()`**
- `useMutation` inserting into `coach_products`
- Payload: `{ title, description?, price, image_url, is_active? }`
- Auto-sets `coach_id`
- `onSuccess`: invalidates `["coach-products"]` query key

**`useUpdateProductStatus()`**
- `useMutation` updating `coach_products` set `is_active`
- Payload: `{ product_id, is_active }`
- Update query includes `.eq('coach_id', userId)` for row-level security enforcement
- `onSuccess`: invalidates `["coach-products"]` query key

### Technical Details
- All hooks use `useAuth()` to get the authenticated user ID — same pattern as `useTeam.ts`, `usePermissionTemplates.ts`
- Strict TypeScript interfaces for all payloads
- No UI files touched


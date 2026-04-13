

## Purge Mock Data and Enforce Live Fetching

### Summary
Remove all hardcoded mock arrays from `FeedPlanner.tsx` and `StoreManager.tsx`. Create a `useCoachPosts` query hook. Both views will show only live Supabase data, with proper empty states when no data exists.

### 1. Add `useCoachPosts` to `useSocialMutations.ts`

Add a `useQuery` hook fetching from `social_posts` where `coach_id = user.id`, ordered by `created_at desc`. Query key: `["social-posts"]` (matches existing invalidation in `useCreatePost`). Map returned rows to the `Post` interface used by FeedPlanner.

### 2. Purge mocks in `FeedPlanner.tsx`

- Delete the `mockPosts` array (lines 52-59)
- Replace `useState<Post[]>(mockPosts)` with data from `useCoachPosts()`
- The local `posts` state becomes derived from the query, with `setPosts` used only for drag-reorder
- Add a `useEffect` to sync query data into local state (for DnD reordering)
- Remove the manual "prepend to local state" block in `handleCreatePost` (lines 228-237) — rely on query invalidation instead
- Add an empty state in the grid: "Henuz gonderi yok" when posts array is empty
- Add `isLoading` state from the query for a skeleton/spinner

### 3. Purge mocks in `StoreManager.tsx`

- Delete the entire `mockProducts` array (lines 18-100)
- Change `useState<StoreProduct[]>(mockProducts)` to `useState<StoreProduct[]>([])`
- Replace the `useEffect` merge logic (lines 129-150) with a simple sync from `liveProducts` only — no mock fallback
- Add an empty state message in `ProductList` when products is empty

### Files
| File | Action |
|------|--------|
| `src/hooks/useSocialMutations.ts` | MODIFY — add `useCoachPosts` query hook |
| `src/components/content-studio/FeedPlanner.tsx` | MODIFY — remove mockPosts, use live query |
| `src/pages/StoreManager.tsx` | MODIFY — remove mockProducts, use only liveProducts |


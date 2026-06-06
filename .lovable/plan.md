## Hotfix Plan

1. Create or confirm the Supabase Storage bucket named `digital-products`.
   - Use the native Supabase Storage bucket operation, not SQL `INSERT INTO storage.buckets`, because this environment requires Storage API for bucket provisioning.
   - Set `public: true` so files can be downloaded without signed URLs.

2. Apply `storage.objects` RLS policies scoped only to `bucket_id = 'digital-products'`.
   - Public SELECT/read access.
   - Authenticated INSERT/upload access.
   - Authenticated UPDATE/modify access.
   - Authenticated DELETE/remove access.
   - Use conflict-safe SQL by dropping same-named policies first, then recreating them.

3. Verify the hotfix.
   - Confirm the bucket exists and is public.
   - Confirm all four policies are present on `storage.objects`.
   - No frontend code changes unless verification reveals an additional mismatch.
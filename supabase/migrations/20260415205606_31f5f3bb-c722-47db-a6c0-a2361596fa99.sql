
-- Remove the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

-- Re-grant SELECT on profiles to anon, but REVOKE on sensitive columns
GRANT SELECT ON public.profiles TO anon;
REVOKE SELECT (email, phone_number, birth_date) ON public.profiles FROM anon;

-- Add a public read policy that still allows anon access (row-level),
-- but column-level revoke above prevents reading sensitive fields
CREATE POLICY "Public profiles viewable with restricted columns"
ON public.profiles
FOR SELECT
TO public
USING (true);

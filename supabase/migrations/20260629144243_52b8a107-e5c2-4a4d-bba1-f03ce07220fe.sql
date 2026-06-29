REVOKE EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated;
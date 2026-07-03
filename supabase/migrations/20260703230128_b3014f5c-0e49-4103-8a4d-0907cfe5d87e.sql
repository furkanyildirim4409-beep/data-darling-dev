REVOKE ALL ON FUNCTION public.verify_reauthentication_nonce(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_reauthentication_nonce(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.verify_reauthentication_nonce(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_reauthentication_nonce(text) TO service_role;
CREATE TABLE IF NOT EXISTS public.reauthentication_nonce_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL,
  used_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, token_hash)
);

GRANT SELECT, INSERT ON public.reauthentication_nonce_uses TO authenticated;
GRANT ALL ON public.reauthentication_nonce_uses TO service_role;

ALTER TABLE public.reauthentication_nonce_uses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own reauthentication nonce uses" ON public.reauthentication_nonce_uses;
CREATE POLICY "Users can read own reauthentication nonce uses"
ON public.reauthentication_nonce_uses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reauthentication nonce uses" ON public.reauthentication_nonce_uses;
CREATE POLICY "Users can insert own reauthentication nonce uses"
ON public.reauthentication_nonce_uses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.verify_reauthentication_nonce(_nonce text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_phone text;
  v_token_hash text;
  v_sent_at timestamp with time zone;
  v_expected_hash text;
  v_inserted integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _nonce IS NULL OR _nonce !~ '^[0-9]{6}$' THEN
    RETURN false;
  END IF;

  SELECT u.email, u.phone, u.reauthentication_token, u.reauthentication_sent_at
  INTO v_email, v_phone, v_token_hash, v_sent_at
  FROM auth.users u
  WHERE u.id = v_uid;

  IF v_token_hash IS NULL OR v_sent_at IS NULL THEN
    RETURN false;
  END IF;

  IF v_sent_at < now() - interval '10 minutes' THEN
    RETURN false;
  END IF;

  IF COALESCE(v_email, '') <> '' THEN
    v_expected_hash := encode(extensions.digest((v_email || _nonce)::text, 'sha224'), 'hex');
  ELSIF COALESCE(v_phone, '') <> '' THEN
    v_expected_hash := encode(extensions.digest((v_phone || _nonce)::text, 'sha224'), 'hex');
  ELSE
    RETURN false;
  END IF;

  IF v_expected_hash IS DISTINCT FROM v_token_hash THEN
    RETURN false;
  END IF;

  INSERT INTO public.reauthentication_nonce_uses (user_id, token_hash)
  VALUES (v_uid, v_expected_hash)
  ON CONFLICT (user_id, token_hash) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN v_inserted = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_reauthentication_nonce(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_reauthentication_nonce(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_reauthentication_nonce(text) TO service_role;
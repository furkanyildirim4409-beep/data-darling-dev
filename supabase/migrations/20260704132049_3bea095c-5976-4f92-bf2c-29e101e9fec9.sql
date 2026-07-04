CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_username text;
  v_role text;
  v_phone text;
BEGIN
  v_username := lower(trim(new.raw_user_meta_data->>'username'));
  IF v_username IS NULL OR v_username !~ '^[a-z0-9_]{3,20}$' THEN
    v_username := NULL;
  END IF;

  v_role := lower(coalesce(new.raw_user_meta_data->>'role',''));
  IF NULLIF(new.raw_user_meta_data->>'invite_token','') IS NOT NULL THEN
    v_role := 'athlete';
  ELSIF v_role NOT IN ('coach','athlete') THEN
    v_role := 'athlete';
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, role, email, username)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    v_role,
    new.email,
    v_username
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        username = CASE WHEN public.profiles.username IS NULL THEN EXCLUDED.username ELSE public.profiles.username END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, v_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Telefon numarasını profile_secrets'a yaz (hassas PII owner-only tabloda tutulur)
  v_phone := NULLIF(trim(new.raw_user_meta_data->>'pending_phone'), '');
  IF v_phone IS NULL THEN
    v_phone := NULLIF(trim(new.raw_user_meta_data->>'phone'), '');
  END IF;

  IF v_phone IS NOT NULL AND v_phone ~ '^\+?[0-9]{10,20}$' THEN
    INSERT INTO public.profile_secrets (user_id, phone_number)
    VALUES (new.id, v_phone)
    ON CONFLICT (user_id) DO UPDATE
      SET phone_number = EXCLUDED.phone_number
      WHERE public.profile_secrets.phone_number IS NULL;
  END IF;

  RETURN new;
END;
$function$;
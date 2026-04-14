CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  assigned_role text;
BEGIN
  assigned_role := COALESCE(new.raw_user_meta_data->>'role', 'athlete');

  INSERT INTO public.profiles (id, full_name, avatar_url, role, email, username)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    assigned_role,
    new.email,
    new.raw_user_meta_data->>'username'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      role = CASE WHEN public.profiles.role IS NULL THEN EXCLUDED.role ELSE public.profiles.role END,
      username = CASE WHEN public.profiles.username IS NULL THEN EXCLUDED.username ELSE public.profiles.username END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, assigned_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
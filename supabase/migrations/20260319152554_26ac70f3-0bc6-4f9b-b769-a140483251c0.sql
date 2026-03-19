CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _invite_token text;
  _invite record;
BEGIN
  _invite_token := NEW.raw_user_meta_data->>'invite_token';

  INSERT INTO public.profiles (id, full_name, avatar_url, role, email, coach_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'athlete'),
    NEW.email,
    NULL
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'athlete'));

  -- If invite token provided, claim it
  IF _invite_token IS NOT NULL AND _invite_token != '' THEN
    SELECT * INTO _invite FROM public.coach_invites
    WHERE token = _invite_token AND used_by IS NULL AND expires_at > now();

    IF _invite IS NOT NULL THEN
      UPDATE public.profiles SET coach_id = _invite.coach_id WHERE id = NEW.id;
      UPDATE public.coach_invites SET used_by = NEW.id, used_at = now() WHERE id = _invite.id;
    END IF;
  END IF;

  -- Link team_members row if email matches a pending invitation
  UPDATE public.team_members
  SET user_id = NEW.id, status = 'active'
  WHERE email = NEW.email AND user_id IS NULL;

  RETURN NEW;
END;
$$;
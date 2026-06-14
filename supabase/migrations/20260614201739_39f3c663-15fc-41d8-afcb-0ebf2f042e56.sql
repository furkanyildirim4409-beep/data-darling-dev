ALTER TABLE public.profiles DISABLE TRIGGER USER;
UPDATE public.profiles
  SET subscription_tier = 'elite',
      subscription_status = 'active',
      updated_at = now()
  WHERE email = 'yavuzselimurgen0990@outlook.com';
ALTER TABLE public.profiles ENABLE TRIGGER USER;
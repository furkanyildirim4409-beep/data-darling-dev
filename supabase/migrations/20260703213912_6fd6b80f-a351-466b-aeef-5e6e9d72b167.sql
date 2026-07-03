
-- 1. Drop the old welcome trigger (was calling global-system-automation)
DROP TRIGGER IF EXISTS premium_welcome_email_trigger ON public.profiles;

-- 2. New trigger function invoking send-email
CREATE OR REPLACE FUNCTION public.trigger_send_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://fsbhbfltathfcpvcjfzt.supabase.co/functions/v1/send-email'::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzYmhiZmx0YXRoZmNwdmNqZnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzY0MzgsImV4cCI6MjA4ODU1MjQzOH0.nRfgLU4qfAWe_qfy9-X4sUrVSHptH3wPWEeI_ZgyST4',
        'X-Webhook-Secret', '3ea62d5a975e4ef48f1b9329cb3c374daa6ca282421a0132ebb1d15ae6bdf4c5'
      ),
      body := jsonb_build_object(
        'type', 'welcome',
        'to', NEW.email,
        'data', jsonb_build_object(
          'name', COALESCE(NEW.full_name, split_part(NEW.email, '@', 1)),
          'role', NEW.role,
          'owner_id', NEW.id
        )
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trigger_send_welcome_email failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER after_profile_insert_send_welcome
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trigger_send_welcome_email();

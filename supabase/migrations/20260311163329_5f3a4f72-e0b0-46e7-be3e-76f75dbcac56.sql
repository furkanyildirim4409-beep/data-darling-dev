CREATE OR REPLACE FUNCTION public.notify_new_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://fsbhbfltathfcpvcjfzt.supabase.co/functions/v1/send-chat-push'::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzYmhiZmx0YXRoZmNwdmNqZnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzY0MzgsImV4cCI6MjA4ODU1MjQzOH0.nRfgLU4qfAWe_qfy9-X4sUrVSHptH3wPWEeI_ZgyST4'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'messages',
      'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
END;
$function$;
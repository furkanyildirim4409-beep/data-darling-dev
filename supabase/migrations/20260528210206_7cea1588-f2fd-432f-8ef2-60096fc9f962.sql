
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing jobs if they exist (idempotent)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT jobid FROM cron.job WHERE jobname IN ('ai-radar-kickoff', 'ai-radar-sweep') LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;
END $$;

-- Kickoff: Saturday 21:00 UTC = Sunday 00:00 Istanbul
SELECT cron.schedule(
  'ai-radar-kickoff',
  '0 21 * * 6',
  $$
  SELECT net.http_post(
    url := 'https://fsbhbfltathfcpvcjfzt.supabase.co/functions/v1/radar-dispatcher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzYmhiZmx0YXRoZmNwdmNqZnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzY0MzgsImV4cCI6MjA4ODU1MjQzOH0.nRfgLU4qfAWe_qfy9-X4sUrVSHptH3wPWEeI_ZgyST4'
    ),
    body := jsonb_build_object('mode', 'kickoff')
  );
  $$
);

-- Sweep: every 30 min from Sat 21:00 UTC through Mon 03:00 UTC (= Mon 06:00 Istanbul)
-- Covers Saturday 21:00-23:30, all of Sunday (UTC), and Monday 00:00-03:00 UTC.
SELECT cron.schedule(
  'ai-radar-sweep',
  '*/30 21-23 * * 6,*/30 * * * 0,0,30 0-2 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://fsbhbfltathfcpvcjfzt.supabase.co/functions/v1/radar-dispatcher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzYmhiZmx0YXRoZmNwdmNqZnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzY0MzgsImV4cCI6MjA4ODU1MjQzOH0.nRfgLU4qfAWe_qfy9-X4sUrVSHptH3wPWEeI_ZgyST4'
    ),
    body := jsonb_build_object('mode', 'resume')
  );
  $$
);

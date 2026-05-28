
-- 1. Extend blood_tests with AI staleness tracking
ALTER TABLE public.blood_tests
  ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_stale_for_ai BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_blood_tests_user_analyzed
  ON public.blood_tests (user_id, last_analyzed_at DESC);

-- 2. Distributed agent queue
CREATE TABLE IF NOT EXISTS public.ai_radar_agent_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id INTEGER NOT NULL,
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL,
  agent_assigned_id TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'queued',
  locked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  run_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (athlete_id, run_started_at)
);

CREATE INDEX IF NOT EXISTS idx_radar_queue_status_agent
  ON public.ai_radar_agent_queue (processing_status, agent_assigned_id);
CREATE INDEX IF NOT EXISTS idx_radar_queue_run_started
  ON public.ai_radar_agent_queue (run_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_radar_queue_coach
  ON public.ai_radar_agent_queue (coach_id);

GRANT SELECT ON public.ai_radar_agent_queue TO authenticated;
GRANT ALL ON public.ai_radar_agent_queue TO service_role;

ALTER TABLE public.ai_radar_agent_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches and team members can view queue rows"
  ON public.ai_radar_agent_queue
  FOR SELECT
  TO authenticated
  USING (
    coach_id = auth.uid()
    OR public.is_active_team_member_of(coach_id)
  );

-- 3. Atomic claim RPC for workers
CREATE OR REPLACE FUNCTION public.claim_radar_queue_batch(_agent_id TEXT, _limit INT)
RETURNS SETOF public.ai_radar_agent_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.ai_radar_agent_queue q
     SET processing_status = 'processing',
         agent_assigned_id = _agent_id,
         locked_at = now()
   WHERE q.id IN (
     SELECT id FROM public.ai_radar_agent_queue
      WHERE processing_status = 'queued'
      ORDER BY batch_id, id
      FOR UPDATE SKIP LOCKED
      LIMIT _limit
   )
   RETURNING q.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_radar_queue_batch(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_radar_queue_batch(TEXT, INT) TO service_role;

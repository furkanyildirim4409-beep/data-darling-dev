
-- 1) academy_content: require explicit published + public (no COALESCE defaults)
DROP POLICY IF EXISTS "Athletes can view coach academy content" ON public.academy_content;
CREATE POLICY "Athletes can view coach academy content"
ON public.academy_content
FOR SELECT
TO authenticated
USING (
  status = 'published'
  AND visibility = 'public'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.coach_id = academy_content.coach_id
  )
);

-- 2) Hide raw Stripe payloads from end users via column-level privilege revocation.
REVOKE SELECT (raw_event) ON public.stripe_transactions FROM authenticated;
REVOKE SELECT (raw_event) ON public.stripe_transactions FROM anon;

REVOKE SELECT (raw_payload) ON public.subscription_events FROM authenticated;
REVOKE SELECT (raw_payload) ON public.subscription_events FROM anon;

-- Keep service_role fully able to read raw payloads.
GRANT SELECT ON public.stripe_transactions TO service_role;
GRANT SELECT ON public.subscription_events TO service_role;

-- 3) profiles: drop the duplicate coach-read policy to reduce drift risk.
DROP POLICY IF EXISTS "Coaches can read their athletes profiles" ON public.profiles;

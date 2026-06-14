CREATE TABLE public.subscription_events (
  id text PRIMARY KEY,
  coach_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  stripe_subscription_id text,
  stripe_customer_id text,
  event_type text NOT NULL,
  previous_status text,
  new_status text,
  previous_tier text,
  new_tier text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_events_coach_id ON public.subscription_events(coach_id, created_at DESC);
CREATE INDEX idx_subscription_events_sub_id ON public.subscription_events(stripe_subscription_id);

GRANT SELECT ON public.subscription_events TO authenticated;
GRANT ALL ON public.subscription_events TO service_role;

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view their own subscription events"
ON public.subscription_events
FOR SELECT
TO authenticated
USING (auth.uid() = coach_id);
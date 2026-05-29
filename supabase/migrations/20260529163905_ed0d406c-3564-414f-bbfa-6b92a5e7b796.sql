CREATE TABLE IF NOT EXISTS public.refund_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    coach_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    requested_amount NUMERIC(10,2) NOT NULL CHECK (requested_amount > 0),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.refund_requests TO authenticated;
GRANT ALL ON public.refund_requests TO service_role;

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches can insert refund requests for their athletes" ON public.refund_requests;
CREATE POLICY "Coaches can insert refund requests for their athletes"
ON public.refund_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = coach_id AND public.is_coach_of(athlete_id));

DROP POLICY IF EXISTS "Coaches and athletes can view their refund requests" ON public.refund_requests;
CREATE POLICY "Coaches and athletes can view their refund requests"
ON public.refund_requests FOR SELECT TO authenticated
USING (
  auth.uid() = athlete_id
  OR auth.uid() = coach_id
  OR public.is_coach_of(athlete_id)
);

DROP POLICY IF EXISTS "Coaches can update their refund requests" ON public.refund_requests;
CREATE POLICY "Coaches can update their refund requests"
ON public.refund_requests FOR UPDATE TO authenticated
USING (auth.uid() = coach_id OR public.is_coach_of(athlete_id))
WITH CHECK (auth.uid() = coach_id OR public.is_coach_of(athlete_id));

DROP TRIGGER IF EXISTS trg_refund_requests_touch ON public.refund_requests;
CREATE TRIGGER trg_refund_requests_touch
BEFORE UPDATE ON public.refund_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_refund_requests_coach   ON public.refund_requests(coach_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refund_requests_athlete ON public.refund_requests(athlete_id, created_at DESC);
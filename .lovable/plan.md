## Deploy `refund_requests` Isolation Table

Create a dedicated `public.refund_requests` ledger so refund flows stop polluting the `orders` table.

### Migration SQL

```sql
CREATE TABLE IF NOT EXISTS public.refund_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    coach_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    requested_amount NUMERIC(10,2) NOT NULL CHECK (requested_amount > 0),
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Required GRANTs (public schema has no default Data API grants)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refund_requests TO authenticated;
GRANT ALL ON public.refund_requests TO service_role;

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- Insert: only the coach-of-record, and they must actually coach the athlete
CREATE POLICY "Coaches can insert refund requests for their athletes"
ON public.refund_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = coach_id AND public.is_coach_of(athlete_id));

-- Select: coach (or sub-coach via is_coach_of) and the athlete themselves
CREATE POLICY "Coaches and athletes can view their refund requests"
ON public.refund_requests FOR SELECT TO authenticated
USING (
  auth.uid() = athlete_id
  OR auth.uid() = coach_id
  OR public.is_coach_of(athlete_id)
);

-- Update: only coach side (status transitions) — admin board comes in Part 2+
CREATE POLICY "Coaches can update their refund requests"
ON public.refund_requests FOR UPDATE TO authenticated
USING (auth.uid() = coach_id OR public.is_coach_of(athlete_id))
WITH CHECK (auth.uid() = coach_id OR public.is_coach_of(athlete_id));

-- updated_at trigger reuses existing touch_updated_at()
CREATE TRIGGER trg_refund_requests_touch
BEFORE UPDATE ON public.refund_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_refund_requests_coach   ON public.refund_requests(coach_id, status, created_at DESC);
CREATE INDEX idx_refund_requests_athlete ON public.refund_requests(athlete_id, created_at DESC);
```

### Notes / deltas vs. the spec
- Added mandatory `GRANT` block (Supabase Data API requirement; missing GRANTs = PostgREST permission errors).
- Added `is_coach_of(athlete_id)` to the SELECT policy so sub-coaches (agency model) inherit visibility, matching project memory.
- Added UPDATE policy + `touch_updated_at` trigger so the `updated_at` column actually moves and status can be transitioned later.
- Added two btree indexes for the obvious admin-board query paths.
- No code changes in this part — refund insert path in `AthleteDetail.tsx` will be re-pointed to this table in a later part.

### Scope
- Part 1/5 only: schema + RLS + grants + indexes. No frontend, no edge function, no data backfill from existing `orders` refund rows.

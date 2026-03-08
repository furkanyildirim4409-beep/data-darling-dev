
-- Payments table for revenue tracking
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL,
  athlete_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TRY',
  status TEXT NOT NULL DEFAULT 'paid',
  description TEXT,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Coaches can manage their own payments
CREATE POLICY "Coaches can view own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (coach_id = auth.uid());

CREATE POLICY "Coaches can insert own payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches can update own payments" ON public.payments
  FOR UPDATE TO authenticated
  USING (coach_id = auth.uid());

CREATE POLICY "Coaches can delete own payments" ON public.payments
  FOR DELETE TO authenticated
  USING (coach_id = auth.uid());

-- Athletes can view their own payments
CREATE POLICY "Athletes can view own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (athlete_id = auth.uid());

-- Enable realtime for workout_logs and daily_checkins
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_checkins;

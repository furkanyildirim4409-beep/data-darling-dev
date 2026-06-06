CREATE TABLE public.assigned_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_checkout_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assigned_payments TO authenticated;
GRANT ALL ON public.assigned_payments TO service_role;

ALTER TABLE public.assigned_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage assigned payments" ON public.assigned_payments
  FOR ALL TO authenticated
  USING (coach_id = auth.uid() OR public.is_active_team_member_of(coach_id))
  WITH CHECK (coach_id = auth.uid() OR public.is_active_team_member_of(coach_id));

CREATE POLICY "Athletes view their own assigned payments" ON public.assigned_payments
  FOR SELECT TO authenticated
  USING (athlete_id = auth.uid());

CREATE TRIGGER trg_assigned_payments_updated_at
  BEFORE UPDATE ON public.assigned_payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_assigned_payments_coach ON public.assigned_payments(coach_id, status);
CREATE INDEX idx_assigned_payments_athlete ON public.assigned_payments(athlete_id, status);

CREATE OR REPLACE FUNCTION public.get_coach_business_metrics(coach_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_package_revenue   NUMERIC := 0;
  total_store_revenue     NUMERIC := 0;
  pending_custom_revenue  NUMERIC := 0;
  paid_custom_revenue     NUMERIC := 0;
  active_athletes_count   INT     := 0;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_package_revenue
  FROM public.payments
  WHERE coach_id = coach_uuid AND status = 'paid';

  SELECT COALESCE(SUM(o.total_price), 0) INTO total_store_revenue
  FROM public.orders o
  JOIN public.profiles p ON p.id = o.user_id
  WHERE p.coach_id = coach_uuid AND o.status = 'paid';

  SELECT COALESCE(SUM(amount), 0) INTO pending_custom_revenue
  FROM public.assigned_payments
  WHERE coach_id = coach_uuid AND status = 'pending';

  SELECT COALESCE(SUM(amount), 0) INTO paid_custom_revenue
  FROM public.assigned_payments
  WHERE coach_id = coach_uuid AND status = 'paid';

  SELECT COUNT(*) INTO active_athletes_count
  FROM public.profiles
  WHERE coach_id = coach_uuid AND role = 'athlete';

  RETURN json_build_object(
    'total_package_revenue',  total_package_revenue,
    'total_store_revenue',    total_store_revenue,
    'pending_custom_revenue', pending_custom_revenue,
    'paid_custom_revenue',    paid_custom_revenue,
    'total_revenue',          total_package_revenue + total_store_revenue + paid_custom_revenue,
    'active_athletes',        active_athletes_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_coach_business_metrics(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_coach_business_metrics(uuid) TO authenticated;
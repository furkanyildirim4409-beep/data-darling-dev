ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS iban TEXT;

CREATE OR REPLACE FUNCTION public.get_coach_business_metrics(coach_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_package_revenue   NUMERIC := 0;
  total_store_revenue     NUMERIC := 0;
  total_custom_revenue    NUMERIC := 0;
  pending_custom_revenue  NUMERIC := 0;
  active_athletes_count   INT     := 0;
BEGIN
  -- ALL-TIME successful standard package payments
  SELECT COALESCE(SUM(amount), 0) INTO total_package_revenue
  FROM public.payments
  WHERE coach_id = coach_uuid
    AND status IN ('paid', 'succeeded');

  -- ALL-TIME e-commerce store revenue attributed via athlete's coach link
  SELECT COALESCE(SUM(o.total_price), 0) INTO total_store_revenue
  FROM public.orders o
  JOIN public.profiles p ON p.id = o.user_id
  WHERE p.coach_id = coach_uuid
    AND o.status = 'paid';

  -- ALL-TIME paid custom assigned invoices
  SELECT COALESCE(SUM(amount), 0) INTO total_custom_revenue
  FROM public.assigned_payments
  WHERE coach_id = coach_uuid
    AND status = 'paid';

  -- Pending escrow (custom invoices awaiting checkout)
  SELECT COALESCE(SUM(amount), 0) INTO pending_custom_revenue
  FROM public.assigned_payments
  WHERE coach_id = coach_uuid
    AND status = 'pending';

  -- Active athletes linked to this coach
  SELECT COUNT(*) INTO active_athletes_count
  FROM public.profiles
  WHERE coach_id = coach_uuid
    AND role = 'athlete';

  RETURN json_build_object(
    'total_package_revenue',  total_package_revenue,
    'total_store_revenue',    total_store_revenue,
    'total_custom_revenue',   total_custom_revenue,
    'paid_custom_revenue',    total_custom_revenue,
    'pending_custom_revenue', pending_custom_revenue,
    'total_revenue',          total_package_revenue + total_store_revenue + total_custom_revenue,
    'active_athletes',        active_athletes_count
  );
END;
$$;
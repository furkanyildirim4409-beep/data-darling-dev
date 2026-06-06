CREATE OR REPLACE FUNCTION public.get_coach_business_metrics(coach_uuid uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_package_revenue   NUMERIC := 0;
  total_store_revenue     NUMERIC := 0;
  total_custom_revenue    NUMERIC := 0;
  pending_custom_revenue  NUMERIC := 0;
  active_athletes_count   INT     := 0;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_package_revenue
  FROM public.payments
  WHERE coach_id = coach_uuid AND status IN ('paid', 'succeeded');

  SELECT COALESCE(SUM(o.total_price), 0) INTO total_store_revenue
  FROM public.orders o
  LEFT JOIN public.profiles p ON p.id = o.user_id
  WHERE o.status IN ('paid', 'shipped', 'completed', 'delivered')
    AND (o.coach_id = coach_uuid OR p.coach_id = coach_uuid);

  SELECT COALESCE(SUM(amount), 0) INTO total_custom_revenue
  FROM public.assigned_payments
  WHERE coach_id = coach_uuid AND status = 'paid';

  SELECT COALESCE(SUM(amount), 0) INTO pending_custom_revenue
  FROM public.assigned_payments
  WHERE coach_id = coach_uuid AND status = 'pending';

  SELECT COUNT(*) INTO active_athletes_count
  FROM public.profiles
  WHERE coach_id = coach_uuid AND role = 'athlete';

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
$function$;
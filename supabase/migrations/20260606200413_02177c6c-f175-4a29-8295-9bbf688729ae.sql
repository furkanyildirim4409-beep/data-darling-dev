CREATE OR REPLACE FUNCTION public.get_coach_business_metrics(coach_uuid uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pkg_payments_revenue    NUMERIC := 0;
  coaching_orders_revenue NUMERIC := 0;
  custom_paid_revenue     NUMERIC := 0;
  shopify_revenue         NUMERIC := 0;
  digital_revenue         NUMERIC := 0;
  pending_custom_revenue  NUMERIC := 0;
  active_athletes_count   INT     := 0;
  coaching_total          NUMERIC := 0;
  store_paid_statuses     TEXT[]  := ARRAY['paid','processing','shipped','completed','delivered'];
  coaching_paid_statuses  TEXT[]  := ARRAY['paid','completed'];
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO pkg_payments_revenue
  FROM public.payments
  WHERE coach_id = coach_uuid AND status IN ('paid','succeeded');

  SELECT COALESCE(SUM(o.total_price), 0) INTO coaching_orders_revenue
  FROM public.orders o
  LEFT JOIN public.profiles p ON p.id = o.user_id
  WHERE o.order_type = 'coaching'
    AND o.status = ANY(coaching_paid_statuses)
    AND (
      o.coach_id = coach_uuid
      OR p.coach_id = coach_uuid
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(o.items, '[]'::jsonb)) it
        WHERE NULLIF(it->>'coach_id','')::uuid = coach_uuid
      )
    );

  SELECT COALESCE(SUM(amount), 0) INTO custom_paid_revenue
  FROM public.assigned_payments
  WHERE coach_id = coach_uuid AND status = 'paid';

  SELECT COALESCE(SUM(o.total_price), 0) INTO shopify_revenue
  FROM public.orders o
  LEFT JOIN public.profiles p ON p.id = o.user_id
  WHERE o.order_type IN ('shopify','digital')
    AND o.status = ANY(store_paid_statuses)
    AND (o.coach_id = coach_uuid OR p.coach_id = coach_uuid);

  SELECT COALESCE(SUM(o.total_price), 0) INTO digital_revenue
  FROM public.orders o
  LEFT JOIN public.profiles p ON p.id = o.user_id
  WHERE o.order_type = 'digital'
    AND o.status = ANY(store_paid_statuses)
    AND (o.coach_id = coach_uuid OR p.coach_id = coach_uuid);

  SELECT COALESCE(SUM(amount), 0) INTO pending_custom_revenue
  FROM public.assigned_payments
  WHERE coach_id = coach_uuid AND status = 'pending';

  SELECT COUNT(*) INTO active_athletes_count
  FROM public.profiles
  WHERE coach_id = coach_uuid AND role = 'athlete';

  coaching_total := pkg_payments_revenue + coaching_orders_revenue;

  RETURN json_build_object(
    'total_package_revenue',  coaching_total,
    'coaching_revenue',       coaching_total,
    'shopify_revenue',        shopify_revenue,
    'digital_revenue',        digital_revenue,
    'other_revenue',          custom_paid_revenue,
    'total_store_revenue',    shopify_revenue,
    'paid_custom_revenue',    custom_paid_revenue,
    'pending_custom_revenue', pending_custom_revenue,
    'total_revenue',          coaching_total + shopify_revenue + custom_paid_revenue,
    'active_athletes',        active_athletes_count
  );
END;
$function$;
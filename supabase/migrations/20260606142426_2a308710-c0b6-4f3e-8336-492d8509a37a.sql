
-- 1. Add coach_id to orders (FK to profiles per project convention)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Backfill from buyer's profiles.coach_id
UPDATE public.orders o
SET coach_id = p.coach_id
FROM public.profiles p
WHERE o.user_id = p.id
  AND o.coach_id IS NULL
  AND p.coach_id IS NOT NULL;

-- 3. Index for coach order list queries
CREATE INDEX IF NOT EXISTS idx_orders_coach_status_created
  ON public.orders (coach_id, status, created_at DESC);

-- 4. Digital product fields on coach_products
ALTER TABLE public.coach_products ADD COLUMN IF NOT EXISTS digital_file_url text;
ALTER TABLE public.coach_products ADD COLUMN IF NOT EXISTS product_kind text NOT NULL DEFAULT 'physical';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coach_products_product_kind_check'
  ) THEN
    ALTER TABLE public.coach_products
      ADD CONSTRAINT coach_products_product_kind_check
      CHECK (product_kind IN ('physical','digital'));
  END IF;
END$$;

-- 5. Populate orders.coach_id on insert/update from items[].coach_id or buyer profile
CREATE OR REPLACE FUNCTION public.populate_order_coach_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach uuid;
  v_item jsonb;
BEGIN
  IF NEW.coach_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.items IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      v_coach := NULLIF(v_item->>'coach_id', '')::uuid;
      IF v_coach IS NOT NULL THEN
        NEW.coach_id := v_coach;
        RETURN NEW;
      END IF;
    END LOOP;
  END IF;

  IF NEW.user_id IS NOT NULL THEN
    SELECT coach_id INTO v_coach FROM public.profiles WHERE id = NEW.user_id;
    IF v_coach IS NOT NULL THEN
      NEW.coach_id := v_coach;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_populate_order_coach_id ON public.orders;
CREATE TRIGGER trg_populate_order_coach_id
  BEFORE INSERT OR UPDATE OF items, user_id ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.populate_order_coach_id();

-- 6. RLS: allow coach (and active team members) to read their store orders
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='orders' AND policyname='Coaches view their store orders'
  ) THEN
    DROP POLICY "Coaches view their store orders" ON public.orders;
  END IF;
END$$;

CREATE POLICY "Coaches view their store orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  coach_id = auth.uid()
  OR public.is_active_team_member_of(coach_id)
);

-- 7. Update business metrics RPC to prefer orders.coach_id with profile fallback
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
  SELECT COALESCE(SUM(amount), 0) INTO total_package_revenue
  FROM public.payments
  WHERE coach_id = coach_uuid AND status IN ('paid', 'succeeded');

  SELECT COALESCE(SUM(o.total_price), 0) INTO total_store_revenue
  FROM public.orders o
  LEFT JOIN public.profiles p ON p.id = o.user_id
  WHERE o.status = 'paid'
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
$$;


-- 1) Rewrite populate_order_coach_id to accept coachId (camelCase) and resolve via coach_products
CREATE OR REPLACE FUNCTION public.populate_order_coach_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_coach uuid;
  v_item jsonb;
  v_variant text;
  v_product text;
BEGIN
  IF NEW.coach_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.items IS NOT NULL THEN
    -- Pass 1: explicit coach id on item (support snake_case & camelCase)
    FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      v_coach := NULLIF(COALESCE(v_item->>'coach_id', v_item->>'coachId'), '')::uuid;
      IF v_coach IS NOT NULL THEN
        NEW.coach_id := v_coach;
        RETURN NEW;
      END IF;
    END LOOP;

    -- Pass 2: resolve via coach_products by shopify variant/product id
    FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      v_variant := NULLIF(COALESCE(v_item->>'shopifyVariantId', v_item->>'shopify_variant_id'), '');
      v_product := NULLIF(COALESCE(v_item->>'shopifyProductId', v_item->>'shopify_product_id', v_item->>'productId'), '');

      IF v_variant IS NOT NULL THEN
        SELECT coach_id INTO v_coach
        FROM public.coach_products
        WHERE shopify_variant_id = v_variant
        LIMIT 1;
        IF v_coach IS NOT NULL THEN
          NEW.coach_id := v_coach;
          RETURN NEW;
        END IF;
      END IF;

      IF v_product IS NOT NULL THEN
        SELECT coach_id INTO v_coach
        FROM public.coach_products
        WHERE shopify_product_id = v_product
        LIMIT 1;
        IF v_coach IS NOT NULL THEN
          NEW.coach_id := v_coach;
          RETURN NEW;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Pass 3: fallback to buyer's coach ONLY for coaching orders
  IF NEW.order_type = 'coaching' AND NEW.user_id IS NOT NULL THEN
    SELECT coach_id INTO v_coach FROM public.profiles WHERE id = NEW.user_id;
    IF v_coach IS NOT NULL THEN
      NEW.coach_id := v_coach;
    END IF;
  END IF;

  -- For shopify/digital orders with no resolvable seller: leave NULL rather than mis-route
  RETURN NEW;
END;
$function$;

-- 2) Clean up leaky RLS policies on public.orders
DROP POLICY IF EXISTS "Coaches can view athlete orders" ON public.orders;
DROP POLICY IF EXISTS "Coaches view athlete orders" ON public.orders;
DROP POLICY IF EXISTS "Coaches can insert orders for their athletes" ON public.orders;
DROP POLICY IF EXISTS "Coaches can update orders for their athletes" ON public.orders;
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;

-- Add UPDATE policy so seller coach (and their active team members) can update status/tracking.
-- The enforce_coach_order_update_whitelist trigger already blocks financial-field tampering.
DROP POLICY IF EXISTS "Coaches update their store orders" ON public.orders;
CREATE POLICY "Coaches update their store orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (coach_id = auth.uid() OR public.is_active_team_member_of(coach_id))
  WITH CHECK (coach_id = auth.uid() OR public.is_active_team_member_of(coach_id));

-- 3) Backfill mis-routed shopify/digital orders using coach_products lookup
WITH resolved AS (
  SELECT o.id,
         COALESCE(
           (SELECT NULLIF(COALESCE(it->>'coach_id', it->>'coachId'), '')::uuid
              FROM jsonb_array_elements(o.items) it
             WHERE NULLIF(COALESCE(it->>'coach_id', it->>'coachId'), '') IS NOT NULL
             LIMIT 1),
           (SELECT cp.coach_id
              FROM jsonb_array_elements(o.items) it
              JOIN public.coach_products cp
                ON cp.shopify_variant_id = NULLIF(COALESCE(it->>'shopifyVariantId', it->>'shopify_variant_id'), '')
             LIMIT 1),
           (SELECT cp.coach_id
              FROM jsonb_array_elements(o.items) it
              JOIN public.coach_products cp
                ON cp.shopify_product_id = NULLIF(COALESCE(it->>'shopifyProductId', it->>'shopify_product_id', it->>'productId'), '')
             LIMIT 1)
         ) AS new_coach_id
    FROM public.orders o
   WHERE o.order_type IN ('shopify','digital')
)
UPDATE public.orders o
   SET coach_id = r.new_coach_id
  FROM resolved r
 WHERE o.id = r.id
   AND r.new_coach_id IS NOT NULL
   AND (o.coach_id IS DISTINCT FROM r.new_coach_id);

-- Null out any shopify/digital orders where seller can't be resolved,
-- so they don't stay incorrectly routed to the buyer's coach (Super Admin).
WITH resolved AS (
  SELECT o.id,
         COALESCE(
           (SELECT NULLIF(COALESCE(it->>'coach_id', it->>'coachId'), '')::uuid
              FROM jsonb_array_elements(o.items) it
             WHERE NULLIF(COALESCE(it->>'coach_id', it->>'coachId'), '') IS NOT NULL
             LIMIT 1),
           (SELECT cp.coach_id
              FROM jsonb_array_elements(o.items) it
              JOIN public.coach_products cp
                ON cp.shopify_variant_id = NULLIF(COALESCE(it->>'shopifyVariantId', it->>'shopify_variant_id'), '')
             LIMIT 1),
           (SELECT cp.coach_id
              FROM jsonb_array_elements(o.items) it
              JOIN public.coach_products cp
                ON cp.shopify_product_id = NULLIF(COALESCE(it->>'shopifyProductId', it->>'shopify_product_id', it->>'productId'), '')
             LIMIT 1)
         ) AS new_coach_id
    FROM public.orders o
   WHERE o.order_type IN ('shopify','digital')
)
UPDATE public.orders o
   SET coach_id = NULL
  FROM resolved r
 WHERE o.id = r.id
   AND r.new_coach_id IS NULL
   AND o.coach_id IS NOT NULL;

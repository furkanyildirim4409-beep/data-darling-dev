ALTER TABLE public.coach_products
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'physical',
  ADD COLUMN IF NOT EXISTS stock_quantity integer,
  ADD COLUMN IF NOT EXISTS track_inventory boolean NOT NULL DEFAULT false;

ALTER TABLE public.coach_products
  DROP CONSTRAINT IF EXISTS coach_products_product_type_check;

ALTER TABLE public.coach_products
  ADD CONSTRAINT coach_products_product_type_check
  CHECK (product_type IN ('physical', 'digital'));
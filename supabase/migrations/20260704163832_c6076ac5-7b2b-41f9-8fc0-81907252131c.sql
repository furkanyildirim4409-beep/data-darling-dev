ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shopify_order_number TEXT,
  ADD COLUMN IF NOT EXISTS shopify_order_status_url TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_shopify_order_number ON public.orders (shopify_order_number);
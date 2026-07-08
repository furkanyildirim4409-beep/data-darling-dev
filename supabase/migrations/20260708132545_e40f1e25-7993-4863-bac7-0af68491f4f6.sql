ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contract_template text,
  ADD COLUMN IF NOT EXISTS contract_updated_at timestamptz;
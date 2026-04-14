
-- Step 1: Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.profiles ADD CONSTRAINT unique_username UNIQUE (username);

-- Step 2: Create emails table
CREATE TABLE IF NOT EXISTS public.emails (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    direction text NOT NULL DEFAULT 'outbound',
    from_email text NOT NULL,
    to_email text NOT NULL,
    subject text,
    body_html text,
    body_text text,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- Step 2b: Validation trigger for direction (instead of CHECK constraint)
CREATE OR REPLACE FUNCTION public.validate_email_direction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direction NOT IN ('inbound', 'outbound') THEN
    RAISE EXCEPTION 'Invalid email direction: %. Must be inbound or outbound.', NEW.direction;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_email_direction
BEFORE INSERT OR UPDATE ON public.emails
FOR EACH ROW EXECUTE FUNCTION public.validate_email_direction();

-- Step 3: Enable RLS
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can manage their own emails
CREATE POLICY "Users can manage own emails"
ON public.emails
FOR ALL TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Policy 2: Head coaches can view sub-coach emails
CREATE POLICY "Head coaches can view team member emails"
ON public.emails
FOR SELECT TO authenticated
USING (is_active_team_member_of(owner_id));

-- Step 4: Index for fast mailbox queries
CREATE INDEX idx_emails_owner_created ON public.emails (owner_id, created_at DESC);

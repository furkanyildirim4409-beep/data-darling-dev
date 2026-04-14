-- 1. Create has_mail_delegation SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.has_mail_delegation(_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = auth.uid()
      AND head_coach_id = _owner_id
      AND status = 'active'
      AND (custom_permissions->'mail'->>'manage')::boolean = true
  )
$$;

-- 2. Drop the broken overly-permissive policy
DROP POLICY IF EXISTS "Head coaches can view team member emails" ON public.emails;

-- 3. Create scoped delegation policies
CREATE POLICY "Delegated sub-coach reads coach emails"
ON public.emails FOR SELECT TO authenticated
USING (public.has_mail_delegation(owner_id));

CREATE POLICY "Delegated sub-coach inserts coach emails"
ON public.emails FOR INSERT TO authenticated
WITH CHECK (public.has_mail_delegation(owner_id));

CREATE POLICY "Delegated sub-coach updates coach emails"
ON public.emails FOR UPDATE TO authenticated
USING (public.has_mail_delegation(owner_id));
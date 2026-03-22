-- Part 1: Add JSONB granular permissions column to team_members
ALTER TABLE public.team_members ADD COLUMN custom_permissions jsonb DEFAULT NULL;

-- Part 2: Create permission_templates table for reusable role templates
CREATE TABLE public.permission_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  head_coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (head_coach_id, name)
);

ALTER TABLE public.permission_templates ENABLE ROW LEVEL SECURITY;

-- Head coaches get full CRUD on their own templates
CREATE POLICY "Coaches manage own templates"
  ON public.permission_templates
  FOR ALL TO authenticated
  USING (head_coach_id = auth.uid())
  WITH CHECK (head_coach_id = auth.uid());

-- Team members can read templates from their head coach
CREATE POLICY "Team members can view templates"
  ON public.permission_templates
  FOR SELECT TO authenticated
  USING (public.is_active_team_member_of(head_coach_id));
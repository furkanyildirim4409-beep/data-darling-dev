-- Part 1: Clean RLS pathways

DROP POLICY IF EXISTS "Coaches can update athlete profiles" ON public.profiles;
CREATE POLICY "Coaches can update athlete profiles"
ON public.profiles
FOR UPDATE
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid() OR coach_id IS NULL);

DROP POLICY IF EXISTS "Team members can update athlete profiles" ON public.profiles;
CREATE POLICY "Team members can update athlete profiles"
ON public.profiles
FOR UPDATE
USING (public.is_active_team_member_of(coach_id))
WITH CHECK (public.is_active_team_member_of(coach_id) OR coach_id IS NULL);

DROP POLICY IF EXISTS "Coaches can manage orders for their athletes" ON public.orders;
DROP POLICY IF EXISTS "Coaches can insert orders for their athletes" ON public.orders;
DROP POLICY IF EXISTS "Coaches can update orders for their athletes" ON public.orders;

CREATE POLICY "Coaches can insert orders for their athletes"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (public.is_coach_of(user_id));

CREATE POLICY "Coaches can update orders for their athletes"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.is_coach_of(user_id))
WITH CHECK (public.is_coach_of(user_id));

-- Part 2: Column escalation guard trigger

CREATE OR REPLACE FUNCTION public.enforce_athlete_profile_write_guards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM NEW.id THEN
    IF NEW.role IS DISTINCT FROM OLD.role OR
       NEW.email IS DISTINCT FROM OLD.email OR
       NEW.xp IS DISTINCT FROM OLD.xp OR
       NEW.bio_coins IS DISTINCT FROM OLD.bio_coins OR
       NEW.level IS DISTINCT FROM OLD.level OR
       NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
      RAISE EXCEPTION 'SECURITY BLOCK: Protected profile columns cannot be altered by a third-party coach authorization layer.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_athlete_profile_write_guards ON public.profiles;
CREATE TRIGGER trg_enforce_athlete_profile_write_guards
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_athlete_profile_write_guards();
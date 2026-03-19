-- 1. Junction table
CREATE TABLE public.team_member_athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  head_coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_member_id, athlete_id)
);

ALTER TABLE public.team_member_athletes ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies — Head Coach (full CRUD)
CREATE POLICY "Head coach can select assignments" ON public.team_member_athletes FOR SELECT TO authenticated USING (head_coach_id = auth.uid());
CREATE POLICY "Head coach can insert assignments" ON public.team_member_athletes FOR INSERT TO authenticated WITH CHECK (head_coach_id = auth.uid());
CREATE POLICY "Head coach can update assignments" ON public.team_member_athletes FOR UPDATE TO authenticated USING (head_coach_id = auth.uid());
CREATE POLICY "Head coach can delete assignments" ON public.team_member_athletes FOR DELETE TO authenticated USING (head_coach_id = auth.uid());

-- 3. RLS Policy — Sub-coach (view own assignments only)
CREATE POLICY "Team members can view own assignments" ON public.team_member_athletes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.team_members WHERE id = team_member_athletes.team_member_id AND user_id = auth.uid()));

-- 4. Auto-sync trigger for athletes_count
CREATE OR REPLACE FUNCTION public.sync_team_member_athlete_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.team_members SET athletes_count = (SELECT count(*) FROM public.team_member_athletes WHERE team_member_id = OLD.team_member_id) WHERE id = OLD.team_member_id;
    RETURN OLD;
  ELSE
    UPDATE public.team_members SET athletes_count = (SELECT count(*) FROM public.team_member_athletes WHERE team_member_id = NEW.team_member_id) WHERE id = NEW.team_member_id;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_athlete_count ON public.team_member_athletes;
CREATE TRIGGER trg_sync_athlete_count AFTER INSERT OR DELETE ON public.team_member_athletes FOR EACH ROW EXECUTE FUNCTION public.sync_team_member_athlete_count();
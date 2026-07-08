CREATE TABLE public.coach_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_contracts TO authenticated;
GRANT ALL ON public.coach_contracts TO service_role;

ALTER TABLE public.coach_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_manage_own_contract"
  ON public.coach_contracts FOR ALL
  TO authenticated
  USING (auth.uid() = coach_id OR public.is_active_team_member_of(coach_id))
  WITH CHECK (auth.uid() = coach_id OR public.is_active_team_member_of(coach_id));

CREATE POLICY "athlete_read_own_coach_contract"
  ON public.coach_contracts FOR SELECT
  TO authenticated
  USING (
    coach_id IN (
      SELECT p.coach_id FROM public.profiles p
      WHERE p.id = auth.uid() AND p.coach_id IS NOT NULL
    )
  );

CREATE TRIGGER coach_contracts_touch_updated_at
  BEFORE UPDATE ON public.coach_contracts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.coach_contracts (coach_id, content, created_at, updated_at)
SELECT id, contract_template,
       COALESCE(contract_updated_at, now()),
       COALESCE(contract_updated_at, now())
FROM public.profiles
WHERE role = 'coach'
  AND contract_template IS NOT NULL
  AND btrim(contract_template) <> ''
ON CONFLICT (coach_id) DO NOTHING;
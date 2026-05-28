# RLS Lifecycle Recalibration + Column Escalation Trigger

Two-part migration that fixes the subscription lifecycle RLS violations without triggering recursion, then locks privilege-escalation columns via a `BEFORE UPDATE` trigger.

## Part 1 — Clean RLS pathways

Drop and recreate UPDATE policies on `profiles` and INSERT/UPDATE on `orders` using only direct column comparisons and the existing security-definer helpers (`is_coach_of`, `is_active_team_member_of`). No inline subqueries against the same table — no recursion risk.

**`profiles` UPDATE**
- `Coaches can update athlete profiles`: USING `coach_id = auth.uid()`, WITH CHECK allows `coach_id = auth.uid() OR coach_id IS NULL` so terminate can null out the link.
- `Team members can update athlete profiles`: mirrors the above through `is_active_team_member_of(coach_id)`.

**`orders` INSERT/UPDATE**
- Split the legacy "FOR ALL" coach policy into separate INSERT and UPDATE policies, both gated by `public.is_coach_of(user_id)`. This covers head coaches and active sub-coaches uniformly and unblocks the refund-insert flow.

## Part 2 — Column escalation guard trigger

Because RLS `WITH CHECK` cannot reference `OLD`, install a `BEFORE UPDATE` trigger `enforce_athlete_profile_write_guards` on `public.profiles`:

- When `auth.uid() <> NEW.id` (i.e. someone other than the athlete is updating), raise an exception if any of these change: `role`, `email`, `xp`, `bio_coins`, `level`, `subscription_tier`.
- All other columns — `subscription_status`, `freeze_until`, `freeze_reason`, `coach_id`, `active_program_id`, etc. — remain freely writable by the coach within their RLS scope.

Function is `SECURITY DEFINER` with `SET search_path = public`. Trigger is `BEFORE UPDATE FOR EACH ROW`.

## Execution

Single migration containing both parts (drop policies → create policies → create function → create trigger). No frontend changes — `AthleteDetail.tsx` handlers already issue correct mutations.

## Out of scope
- No INSERT/SELECT/DELETE policy changes on `profiles`.
- No changes to athlete-self order policies.
- No new tables, no edge functions.

## Verification
After apply: run `supabase--linter` and confirm `subscription_status`, `freeze_until`, `freeze_reason`, `coach_id`, `active_program_id` writes succeed for a coach against their athlete, while `role`/`xp`/`bio_coins` writes raise the guard exception.

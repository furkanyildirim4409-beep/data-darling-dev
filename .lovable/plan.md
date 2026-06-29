
## Security Hardening Plan — 4 Surgical Fixes

### Fix 1 — Profile Data Exposure (Critical)

**Migration:**
- Drop existing broad `SELECT` policies on `public.profiles` (including the `has_role(_, 'coach')` based one).
- Recreate a single tight `SELECT` policy:
  - `USING (id = auth.uid() OR coach_id = auth.uid() OR public.is_active_team_member_of(coach_id) OR public.has_role(auth.uid(), 'admin'))`
  - This preserves coach→athlete and team-member→athlete reads needed by the app, but removes the "any authenticated user can read any coach" leak.
- Create `public.public_coach_profiles` view (security_invoker = true) exposing only safe columns: `id, full_name, username, avatar_url, bio, specialty, gym_name, level, is_active, role`. Filter `WHERE role = 'coach' AND is_active = true`.
- `GRANT SELECT ON public.public_coach_profiles TO anon, authenticated`.

**Frontend:**
- Audit and switch coach discovery/explore reads from `profiles` to `public_coach_profiles`:
  - Likely files: `src/pages/Discovery.tsx`, `src/pages/Explore.tsx`, `src/components/coach/CoachCard.tsx`, `src/hooks/useCoachLeaderboard*`, leaderboard hooks. Will grep before editing.
- Leave self-profile / coach-of-athlete reads on `profiles` (still allowed by RLS).

### Fix 2 — Auto-Login Tokens Lockdown

**Migration:**
- `DROP POLICY` for any `SELECT` on `public.auto_login_tokens` (the single existing policy).
- Keep table RLS enabled with no SELECT policy → no client can read.
- `REVOKE SELECT ON public.auto_login_tokens FROM anon, authenticated`.
- Service role retains full access for consumption inside the `auto-login` edge function (already used).
- Verify no frontend code reads from `auto_login_tokens` (grep). If found, route through edge function.

### Fix 3 — Generate-AI-Program RBAC

**Edge function (`supabase/functions/generate-ai-program/index.ts`):**
- At top of handler (after CORS): validate JWT via `getClaims`/`getUser` from the request Authorization header using anon client.
- With service-role client, query `user_roles` (preferred — already canonical) for `role = 'coach' OR role = 'admin'`.
- If missing → return `403 { error: 'Forbidden: coach role required' }` with CORS headers.
- Keep rest of pipeline unchanged.

### Fix 4A — `ai_weekly_analyses` Athlete Read

**Migration:**
- Add policy: `CREATE POLICY "Athletes read own weekly analyses" ON public.ai_weekly_analyses FOR SELECT TO authenticated USING (athlete_id = auth.uid());`
- (Existing coach/team policies untouched.)
- Confirm `GRANT SELECT` to authenticated already in place; add if missing.

### Fix 4B — Coach Invite Flow via RPC Only

**Audit + Frontend:**
- Grep for direct `from('coach_invites')` reads in client code.
- Replace any direct lookups in invite acceptance flow (e.g., `src/pages/InviteAccept.tsx` or similar) with `supabase.rpc('claim_invite', { _token, _athlete_id })`.
- Display result based on RPC `status` field (`ok` / `invalid` / etc.) — no need to read the row beforehand.

**Migration (defensive):**
- Tighten `coach_invites` SELECT policy so only the owning coach can read invites they created. Athletes never SELECT — they only call `claim_invite` (SECURITY DEFINER bypasses RLS).

### Delivery Order
1. Migration (all SQL fixes in one transaction).
2. Edge function update + redeploy `generate-ai-program`.
3. Frontend swaps (Discovery → view, Invite → RPC).
4. Mark related security findings as fixed via `manage_security_finding`.

### Risks / Notes
- Tightening `profiles` SELECT may break any UI assuming open coach reads. The new view covers Discovery; self/coach/team reads still work. I'll grep usages before migrating to confirm coverage.
- The `coach_invites` tightening is additive — RPC path (already SECURITY DEFINER) is unaffected.

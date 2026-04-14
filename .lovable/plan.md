

## Hotfix: "Ghost Data" Athlete List Bug

### Diagnosis

**RLS is NOT the problem.** The `profiles` table has a `"Public profiles are viewable by everyone."` policy with `USING (true)` — meaning every SELECT succeeds unconditionally. Additionally, there are explicit coach policies (`coach_id = auth.uid()`). RLS cannot be blocking reads.

**The hook query is clean.** `useAthletes.ts` queries `.eq("role", "athlete").eq("coach_id", activeCoachId)` with no extra restrictive filters like `subscription_status` or `onboarding_completed`.

**Root cause is a timing/stability issue in `useAthletes.ts`:**

1. **Object-reference dependency churn**: The `useCallback` for `fetchAthletes` depends on `teamMember` (an object). Every time `AuthContext.fetchProfile()` runs (on auth state change, session restore), `setTeamMember(teamData ?? null)` is called — even if the data is identical, a new object reference is produced if `teamData` is non-null. This recreates the callback → triggers the `useEffect` → fires a re-fetch. For sub-coaches this is the likely cause of the "flash then disappear" pattern if the re-fetch timing coincides with stale `activeCoachId`.

2. **Realtime channel identity collision**: The channel name is hardcoded as `"athletes-realtime"`. If the component unmounts/remounts (e.g., due to auth context re-render), the old channel may not be fully removed before the new one subscribes, causing missed events or double-fetches that race.

3. **No guard against stale closures**: `fetchAthletes` captures `activeCoachId` from render scope. If `activeCoachId` changes mid-flight (e.g., `null` → `userId` during auth hydration), the first call with `null` triggers the early return setting `athletes=[]`, overwriting the valid data from the second call.

### Plan

#### 1. Stabilize the hook dependencies (`src/hooks/useAthletes.ts`)
- Extract only the primitive IDs needed: `teamMemberId = teamMember?.id`, `teamMemberPermissions` (already a string). Remove `teamMember` object from the dependency array.
- Add a guard: if `activeCoachId` hasn't stabilized yet (still null while `user` exists and auth is loading), skip the fetch entirely rather than setting `athletes=[]`.
- Use a unique channel name incorporating `activeCoachId` to prevent subscription collisions.

#### 2. Add stale-closure protection
- At the top of `fetchAthletes`, capture a local `const coachId = activeCoachId`. After the async Supabase call returns, verify the current `activeCoachId` ref still matches before calling `setAthletes`. If it doesn't match, discard the result (another fetch with the correct ID is already in flight).
- Implement this via a `useRef` for `activeCoachId` that the callback checks against.

#### 3. No database changes needed
RLS policies are correct and permissive. No SQL migration required.

### Files

| File | Action |
|------|--------|
| `src/hooks/useAthletes.ts` | MODIFY — stabilize deps, add stale-closure guard, unique channel name |

### Technical Detail

```text
Current flow (buggy):
  Auth hydrates → activeCoachId = null → fetchAthletes() → sets athletes=[]
  Profile loads → activeCoachId = userId → fetchAthletes() → sets athletes=[...] ✓
  teamMember ref changes → fetchAthletes() recreated → useEffect fires → re-fetch
  ↑ race condition: if the null-fetch resolves AFTER the valid fetch, athletes=[]

Fixed flow:
  Auth hydrates → activeCoachId = null → fetchAthletes() skips (no user yet)
  Profile loads → activeCoachId = userId → fetchAthletes() → sets athletes=[...] ✓
  No spurious re-fetches from object reference churn
  Stale closure guard prevents old responses from overwriting newer data
```


# Part 3/3 — Avatar Unification & Compliance Pulse Audit

## 1. TopBar avatar wiring (real fix)

**File:** `src/components/layout/TopBar.tsx` (line 223)

Replace the hardcoded placeholder with the authenticated coach's avatar from `useAuth().profile`:

```tsx
<AvatarImage
  src={profile?.avatar_url || "/placeholder.svg"}
  className="object-cover"
/>
```

`profile` is already destructured from `useAuth()` on line 44 — no new imports, no context changes. `AvatarFallback` initials logic stays intact for users without an uploaded avatar.

## 2. Compliance Pulse + Critical Stats audit (no changes required)

Verified the live data path is already production-clean — no static counters or placeholders remain:

- **`stats.criticalAlerts`** (`useDashboardData.ts` line 309) → derived from `critical.length`, the behavioral-risk array built in Part 2 (missed workouts + nutrition gap).
- **`compliance.workoutCompliance`** (line 209) → `weekCompleted / weekWorkouts.length` from `assigned_workouts` rows where `coach_id = activeCoachId`, `scheduled_date` between Monday–Sunday of the current week, scoped to the athlete roster.
- **`compliance.checkinCompliance`** (line 216) → distinct `user_id` count from `daily_checkins` in the last 48 h divided by roster size.
- **`CompliancePulse.tsx`** consumes those two props directly and renders donuts — no mock fallback, no hardcoded numbers.
- **`CommandCenter.tsx`** passes the live `compliance` + `stats` objects straight through to `CompliancePulse` and `StatCard`.

No edits needed in `CompliancePulse.tsx`, `CommandCenter.tsx`, or `useDashboardData.ts` — the live wiring requested in Part 3 was already completed in Parts 1/2.

## Files touched

- `src/components/layout/TopBar.tsx` — single-line AvatarImage src swap.

# Roster Filter Matrix — Real DB Wiring

Hook the four filter chips on the roster to live data from `daily_checkins`, decayed readiness, and paid coaching `orders`.

## 1. Data: enrich `useAthletes` with check-in and subscription signals

`src/hooks/useAthletes.ts`:
- Separate the existing 60-day `daily_checkins` query result into a `lastCheckinAt` map (most-recent `created_at` per `user_id`). Keep the combined activity map for decay/lastActive.
- Add a third parallel query: `orders` where `user_id IN athleteIds AND status='paid' AND order_type='coaching'`, selecting `user_id, expires_at, created_at`. Reduce to a `subscriptionExpiry` map per athlete (max `expires_at`, fallback null).
- Extend `mapProfileToAthlete(row, lastActivityIso, lastCheckinIso, expiryIso)`:
  - `lastCheckinAt = lastCheckinIso` (ISO, ungormatted — used for filter math)
  - `subscriptionExpiry = expiryIso ?? ""` (ISO; UI formats as needed)

## 2. Type extension

`src/types/shared-models.ts` — add to `Athlete`:
```ts
lastCheckinAt?: string | null;
```
`subscriptionExpiry` already exists on `UserProfile`.

## 3. Filter logic

`src/components/athletes/AthleteRoster.tsx` — replace the existing filter predicates with real-DB-backed checks:

- **High Risk**: `a.injuryRisk === "High" || a.injuryRisk === "Inactive" || a.readiness < 40`
- **Missed Check-in**: `!a.lastCheckinAt || (Date.now() - new Date(a.lastCheckinAt).getTime()) > 48 * 3600 * 1000`. Time math runs in epoch ms, which is timezone-agnostic — equivalent to "48 h ago" in Istanbul or any locale.
- **Süresi Dolanlar** (expired): `a.subscriptionExpiry && new Date(a.subscriptionExpiry).getTime() < Date.now()`. Replace the previous "Süresi Doluyor" badge label and filter id (`expiring` → `expired`) so the chip explicitly surfaces expired subscriptions only.
- **All**: unchanged.

Counts above each chip recompute from the same predicates via `useMemo` so they stay in sync with `filteredAthletes` after refetch.

## 4. Page-level attention banner

`src/pages/Athletes.tsx` — replace the `athletesNeedingAttention` predicate to match the high-risk + missed-checkin filters above:
```ts
const needs = athletes.filter(a =>
  a.injuryRisk === "High" || a.injuryRisk === "Inactive" || a.readiness < 40 ||
  !a.lastCheckinAt || (Date.now() - new Date(a.lastCheckinAt).getTime()) > 48 * 3600 * 1000
);
```

## 5. Realtime

`useAthletes` already subscribes to `daily_checkins INSERT`; add `INSERT` on `orders` so paid-purchase refresh propagates to expiry counts.

## Files touched

- `src/hooks/useAthletes.ts`
- `src/types/shared-models.ts`
- `src/components/athletes/AthleteRoster.tsx`
- `src/pages/Athletes.tsx`

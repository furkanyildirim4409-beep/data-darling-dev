# Athlete Decay Motor + Timestamp Localization

Refactor `src/hooks/useAthletes.ts` so the roster grid reflects activity-based decay and human-readable timestamps.

## 1. Activity signal source

Profiles don't store a denormalized `last_activity_date`. Compute it from the two real activity tables:

- `daily_checkins.created_at` (per `user_id`)
- `workout_logs.completed_at` (per `user_id`)

After the profiles query, run two parallel queries scoped to the fetched `athleteIds` (last 60 days) and reduce to `Map<athleteId, lastActivityISO>` taking the max of the two streams. Fallback: `profiles.updated_at`.

## 2. Decay formula (applied in mapper)

For each athlete, compute `elapsedDays = floor((Date.now() - lastActivity) / 86_400_000)`:

- `elapsedDays <= 3` → no change.
- `3 < elapsedDays < 14` → `readiness = max(0, baseReadiness − (elapsedDays − 3) × 10)`; `compliance = max(0, baseCompliance − (elapsedDays − 3) × 10)`.
- `elapsedDays >= 14` → `readiness = 0`, `compliance = 0`, `injuryRisk = "Inactive"`.

Promote `injuryRisk` to `"High"` if not inactive but `readiness < 40`.

## 3. Type widening

`src/types/shared-models.ts` — extend `UserProfile.injuryRisk` union:
```ts
injuryRisk: "Low" | "Medium" | "High" | "Inactive";
```
Existing consumers already render via string switches; "Inactive" will fall through to their default badge styling, which we'll patch only if a runtime issue surfaces (out of scope for this pass).

## 4. Timestamp beautifier

Add a local helper:

```ts
const fmt = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false,
});
function formatTs(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return fmt.format(d).replace(",", "");
}
```

Apply to `joinDate` (from `created_at`) and `lastActive` (from resolved last-activity date) inside `mapProfileToAthlete`. Output shape: `26.05.2026 08:15`.

## 5. Realtime invalidation

Add two extra subscriptions on the existing realtime channel so decay refreshes when activity changes:

- `INSERT` on `daily_checkins`
- `INSERT` on `workout_logs`

Both call `fetchAthletesRef.current()`.

## Files touched

- `src/hooks/useAthletes.ts` — activity fetch, decay, timestamp format, realtime additions.
- `src/types/shared-models.ts` — widen `injuryRisk` union with `"Inactive"`.

# Energy Bank Live Sync + Smart Contract Expiry

## File 1 — `src/components/athlete-detail/EnergyBank.tsx`

Convert from a dumb display to a self-fetching, realtime-synced widget.

### Props
- Change from `percentage` to `athleteId: string`. Update the call site in `src/pages/AthleteDetail.tsx` (line 221) to pass `athlete.id`.

### Data fetching
- On mount + when `athleteId` changes, fetch the most recent `daily_checkins` row for `user_id = athleteId` ordered by `created_at desc limit 1` (select `mood, sleep_hours, soreness, stress, digestion, created_at`).
- Compute `percentage`:
  - If no row, or if `Date.now() - new Date(created_at).getTime() > 24h` → force `0`.
  - Otherwise: average of `mood, 6 - soreness, 6 - stress, digestion` (each 1–5 scale), plus a sleep factor (`min(sleep_hours,8)/8 * 5`), normalised to 0–100. Keeps it consistent with `wellness-radar-scaling` memory (Soreness & Stress inverted).
- Subscribe to `postgres_changes` INSERT on `daily_checkins` filtered to this user; re-run the fetch. Cleanup via `removeChannel`. Listener attached before `.subscribe()` per realtime memory.

### Drill-down dialog
- Top-right `DropdownMenu` with `MoreVertical` trigger → menu item "Geçmişi Görüntüle".
- Opens a `Dialog` titled `"Enerji Rezervi & Davranış Geçmişi"` with a glass-blur surface.
- Inside: fetch last 14 `daily_checkins` rows for this athlete, render a `recharts` `LineChart` of computed energy% over time + a compact list of datestamps with mood/sleep/stress chips.

### Visuals
- Keep the existing battery icon + percentage layout intact. Add the dropdown to the upper-right. When `percentage === 0` show `BatteryWarning` in destructive tone with a subtle pulse.

## File 2 — `src/components/athlete-detail/SmartContract.tsx`

Replace mock secure/missed display with real contract countdown.

### Props
- Replace with `athleteId: string`. Keep `missedWorkouts` & `totalWorkouts` props (still useful as a secondary line) — passed through from AthleteDetail unchanged.

### Data fetching
- Query latest paid coaching order for this athlete:
  ```
  orders: select id, items, created_at, expires_at, status
  where user_id = athleteId and status = 'paid' and order_type = 'coaching'
  order by created_at desc limit 1
  ```
- Determine expiry target:
  - If `expires_at` present → use it.
  - Else iterate `items` to find the first `type|item_type === 'coaching'` entry, take its `package_id` (or `coaching_package_id`), fetch `coaching_packages.duration_months`, then `expiry = created_at + duration_months months`.

### Computation
```ts
const daysRemaining = expiryTarget
  ? Math.max(0, Math.ceil((new Date(expiryTarget).getTime() - Date.now()) / 86_400_000))
  : null;
```

### UI
- Card keeps the glass shell. Left icon = `ShieldCheck` (success) when `daysRemaining > 7`, `ShieldAlert` (destructive + `animate-pulse`) when `daysRemaining <= 7`, `Lock` muted when no active package.
- Title: "Akıllı Sözleşme".
- Primary line: futuristic neon badge — `{daysRemaining} GÜN KALDI` (or `Aktif Paket Yok`). Uses `border-primary/40 bg-primary/10 text-primary` normally; flips to destructive + `pulse-red` when `<= 7`.
- Secondary line: `Bu ay {missedWorkouts}/{totalWorkouts} kaçırıldı` (unchanged).

## File 3 — `src/pages/AthleteDetail.tsx` (line 221-222)
- Update props: `<EnergyBank athleteId={athlete.id} />` and `<SmartContract athleteId={athlete.id} missedWorkouts={...} totalWorkouts={...} />`.
- Remove the now-unused `energyLevel` and `isVaultSecure` derivations only if they are not referenced elsewhere; otherwise leave intact.

## Out of scope
- No DB migrations; `orders.expires_at` and `coaching_packages.duration_months` already exist.
- No changes to other widgets in the bento grid.

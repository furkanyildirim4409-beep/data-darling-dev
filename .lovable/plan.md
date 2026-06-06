## Fix All-Time Revenue in Business Pulse

Refactor `src/hooks/useBusinessPulse.ts` to use the existing `get_coach_business_metrics` RPC for the revenue total, while keeping the 30-day athlete/workout chart logic intact.

### Changes

**File: `src/hooks/useBusinessPulse.ts`**

1. Keep existing parallel fetches for `profiles` (athletes) and `workout_logs` (last 30 days) — these still drive the chart, growth rates, and current counters.
2. Drop the 30-day `payments` query.
3. Add a parallel call: `supabase.rpc('get_coach_business_metrics', { coach_uuid: coachId })`.
4. Set `totalRevenue` = `rpc.data.total_revenue` (sum of all-time package + store + custom invoices, already computed server-side via SECURITY DEFINER).
5. Set chart `revenue` to `0` for each day (the card no longer needs a daily revenue series; the area chart's revenue line will read flat — acceptable per spec).
6. Set `revenueGrowth = "0"` (deprecated since we report all-time).
7. Keep `athleteGrowth` and `workoutGrowth` calculations unchanged.

### Why this approach

- `get_coach_business_metrics` already sums `payments` (paid/succeeded) + `orders` (joined via `profiles.coach_id`, since `orders` has no `coach_id` column) + `assigned_payments` (paid). Re-implementing it client-side would duplicate the orders→athletes join and risk drift.
- Runs as SECURITY DEFINER, bypassing RLS surprises for sub-coaches using `activeCoachId`.
- Single round-trip for revenue instead of three.

### Note on the BusinessPulse chart

The yellow "Gelir" area in `BusinessPulse.tsx` will render flat at 0. The header KPI ("Toplam Gelir") will correctly show the all-time total. If you also want the chart's revenue line removed or relabeled, say the word and I'll adjust `BusinessPulse.tsx` in the same pass.

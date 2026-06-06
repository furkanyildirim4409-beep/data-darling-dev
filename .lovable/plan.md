# Hydrate Business Dashboard with Real Metrics (Part 2/6)

## Naming conflict — important

`useBusinessPulse.ts` already exists and powers the **30-day area chart** on the main dashboard (`BusinessPulse.tsx`, used in `CommandCenter`). It returns `{ chartData, currentAthletes, currentWorkouts, totalRevenue, athleteGrowth, workoutGrowth, revenueGrowth, isLoading }` — a different contract from the RPC.

Repurposing it to return the RPC payload would **silently break the dashboard chart**. So:

- I'll create a **new hook `useBusinessMetrics(coachId?)`** that wraps `supabase.rpc('get_coach_business_metrics', { coach_uuid })` via React Query, matching your spec exactly.
- `useBusinessPulse.ts` stays untouched — it still feeds the 30-day chart on the main dashboard. No mock data is present there; it already reads live `payments`, `workout_logs`, and `profiles`.

## Files to change

### 1. `src/hooks/useBusinessMetrics.ts` (new)

```ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessMetrics {
  total_package_revenue: number;
  total_store_revenue: number;
  pending_custom_revenue: number;
  paid_custom_revenue: number;
  total_revenue: number;
  active_athletes: number;
}

export function useBusinessMetrics(coachId?: string) {
  return useQuery<BusinessMetrics | null>({
    queryKey: ["business_metrics", coachId],
    queryFn: async () => {
      if (!coachId) return null;
      const { data, error } = await supabase.rpc("get_coach_business_metrics", {
        coach_uuid: coachId,
      });
      if (error) throw error;
      return data as unknown as BusinessMetrics;
    },
    enabled: !!coachId,
    staleTime: 60_000,
  });
}
```

### 2. `src/pages/Business.tsx`

- Pull `activeCoachId` from `useAuth()` and call `useBusinessMetrics(activeCoachId)`.
- Replace the four `StatCard`s with the RPC-driven labels:
  - **Toplam Gelir** → `data.total_revenue`
  - **E-Ticaret Geliri** → `data.total_store_revenue`
  - **Aktif Sporcular** → `data.active_athletes`
  - **Bekleyen Ödemeler** → `data.pending_custom_revenue`
- The existing `usePayments()` data continues to drive the Payment Records list + delete/status flows (out of scope to rewire here).
- Add a new **Revenue Split donut** card directly under the StatCards using `recharts` (`PieChart`, `Pie`, `Cell`, `Tooltip`, `ResponsiveContainer`, `Legend`):
  - Slice 1: "Koçluk Paketleri" → `total_package_revenue` — emerald `#10B981`
  - Slice 2: "E-Ticaret" → `total_store_revenue` — blue `#3B82F6`
  - Empty state when both are 0: show centered muted-foreground message "Henüz gelir kaydı yok" (no mock data per project core rule).
  - Custom tooltip uses semantic tokens + the slice color for the value; center label shows `₺{total_revenue}`.
- Keep skeleton loading state while `isLoading`.

## Out of scope (per part splitting)

- Wiring an "Assign Custom Payment" dialog into `assigned_payments` — that's a later part.
- Modifying `BusinessPulse.tsx` / `useBusinessPulse.ts`.
- Touching `usePayments` or the existing payment records list.

## Open question

The four stat cards currently include "Toplam Ödeme" (count of payment rows). Your spec replaces it with "E-Ticaret Geliri". I'll go with your spec (drop the count card). Confirm if you'd rather keep 5 cards instead.

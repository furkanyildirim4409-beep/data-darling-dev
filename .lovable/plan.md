## Goal
Wire `src/components/athlete-detail/AiHistoryWidget.tsx` to `coach_action_ledger` so the AI insights rendered on each athlete profile reflect the same lifecycle (`pending` / `resolved` / `ignored`) the coach sees in `Alerts.tsx`, and let the coach dismiss an alert inline without leaving the profile.

This is Part 1/2 — data layer only. UI badges/conditional rendering land in Part 2.

## Scope
- Single file edited: `src/components/athlete-detail/AiHistoryWidget.tsx`
- No DB migrations (the `coach_action_ledger` table already exists and is used by `Alerts.tsx` / `ActionLedgerDesk.tsx`)
- No edge function or schema changes
- Existing logic (severity grouping, session selector, `executeAiAction`, MutationConfigDialog, expand/collapse, completed action badges) stays intact

## Changes to `AiHistoryWidget.tsx`

### 1. Imports
- Add `useQuery`, `useMutation`, `useQueryClient` from `@tanstack/react-query`
- Add `toast` from `sonner` (keep existing `toast` from `@/hooks/use-toast` for the action-execute flow to avoid behavior drift)
- Icon set unchanged

### 2. Ledger fetch hook
Inside the component, add a React Query fetch keyed by athlete:

```ts
const queryClient = useQueryClient();

const { data: ledgerActions } = useQuery({
  queryKey: ['coach_action_ledger', athleteId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('coach_action_ledger')
      .select('source_insight_id, status')
      .eq('athlete_id', athleteId);
    if (error) throw error;
    return data || [];
  },
  enabled: !!athleteId,
});

const ledgerMap = useMemo(() => {
  return (ledgerActions || []).reduce((acc, row) => {
    if (row.source_insight_id) acc[row.source_insight_id] = row.status;
    return acc;
  }, {} as Record<string, string>);
}, [ledgerActions]);
```

### 3. Inline Dismiss ("Yok Say") mutation
Prepared now, consumed by Part 2's UI:

```ts
const dismissMutation = useMutation({
  mutationFn: async (intervention: AiInsight) => {
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase.from('coach_action_ledger').insert({
      coach_id: user.id,
      athlete_id: athleteId,
      source_insight_id: intervention.id,
      issue_title: intervention.title,
      issue_type: intervention.severity === 'high' ? 'biometric_anomaly' : 'low_adherence',
      status: 'ignored',
      issue_details: {
        description: intervention.analysis,
        source: 'athlete_profile_direct',
      },
    });
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['coach_action_ledger', athleteId] });
    sonnerToast.success('Sorun yok sayıldı ve loglara eklendi.');
  },
  onError: (err: any) => {
    sonnerToast.error(err?.message || 'Yok sayma işlemi başarısız.');
  },
});
```

(`sonnerToast` = aliased import from `sonner` to avoid colliding with the existing `useToast` `toast`.)

### 4. Expose to render layer (Part 2 hookup)
- `ledgerMap` and `dismissMutation` are declared at component scope so the upcoming JSX refactor (badges + "Yok Say" button) can consume them with zero further wiring.
- No JSX changes in this part — existing render output is byte-identical apart from the new hooks running.

## Out of scope (Part 2)
- Rendering ledger status badges (Çözüldü / Yok Sayıldı / Bekliyor) next to insights
- "Yok Say" button placement and confirm UX
- Filtering or hiding already-resolved insights
- Any change to `Alerts.tsx`, `ActionLedgerDesk.tsx`, or edge functions

## Risk / verification
- `coach_action_ledger` columns used (`source_insight_id`, `status`, `coach_id`, `athlete_id`, `issue_title`, `issue_type`, `issue_details`) match what `Alerts.tsx` already inserts, so RLS + grants are known-good.
- React Query is already used elsewhere in the project (verified via `useDashboardData`, `useAthletes`, etc.), so no provider setup needed.
- Verification: load an athlete profile, confirm no console/network errors, and confirm the `coach_action_ledger` query fires once with the correct `athlete_id` filter.

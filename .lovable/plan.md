# Action Ledger Pipeline — Alerts Page

The `coach_action_ledger` table and `ActionLedgerDesk` component already exist from the prior CommandCenter integration. This plan ports the same pattern into `src/pages/Alerts.tsx`.

## 1. Database
No migration needed. Table `coach_action_ledger` is live with RLS (`coach_id = auth.uid()`), realtime publication, and the four statuses (`pending` / `resolved` / `failed` / `ignored`). The existing `source_insight_id` column will be reused to dedupe against `ai_weekly_analyses.id`.

## 2. `src/pages/Alerts.tsx` — AI Intervention Queue refactor
Strip the per-action execution flow (supplement / program / message / nutrition buttons, `MutationConfigDialog`, `handleActionExecute`, `handleActionClick`, `executeAiAction`, `resolvingIds`, `pendingAction`) from the queue cards. The queue becomes a triage list only.

Replace each card's footer with a single dark-glass **Popover** trigger ("Eylem Al"). The popover content (centered, `bg-popover/95 backdrop-blur` styling) exposes exactly two buttons:

- **[Yok Say]** → `insert` into `coach_action_ledger` with `status: 'ignored'`, `issue_type: severity === 'high' ? 'biometric_anomaly' : 'low_adherence'`, `issue_title: intervention.title`, `source_insight_id: intervention.id`, `coach_id: activeCoachId ?? user.id`, `athlete_id: intervention.athlete_id`. On success, remove the card from `aiInterventions` with `AnimatePresence` + `motion.div` height fade-out.
- **[Listeye Ekle]** → same insert but `status: 'pending'`. Same removal animation. After insert, call `queryClient.invalidateQueries({ queryKey: ['coach_action_ledger'] })` so the ledger desk refreshes immediately.

Filter the initial fetch in `fetchAiInterventions` to exclude any `ai_weekly_analyses.id` already present in `coach_action_ledger` (mirrors `AiDoctorRadar`'s `fetchLedgered` pattern).

Keep the collapsible "Detaylı Analiz" section and severity badges intact.

## 3. Kritik Masası & Eylem Defteri panel
Mount the existing `<ActionLedgerDesk />` directly below the AI Müdahale Kuyruğu block and above the main alert grid. No new component needed — it already:
- Fetches `status = 'pending'` rows scoped by RLS
- Groups by athlete with avatar + accordion
- Renders 🟢 Çözüldü / 🔴 Çözülmedi per-row buttons that fire `update({ status })` with optimistic UI
- Subscribes to realtime `postgres_changes` for live invalidation across coach sessions

Wrap it in a section header consistent with the page (`Brain` → `ClipboardList` icon already inside the card).

## 4. Cleanup
- Remove imports no longer used in `Alerts.tsx`: `executeAiAction`, `AiActionType`, `MutationConfigDialog`, `Pill`, `Dumbbell`, `MessageSquare`, `UtensilsCrossed`, `Sparkles`, `CheckCircle2`, `actionIcons`, `actionColors`, `AiAction` interface.
- Add: `Popover`, `PopoverTrigger`, `PopoverContent`, `motion`, `AnimatePresence`, `useQueryClient`, `EyeOff`, `ListPlus` icons, `ActionLedgerDesk`.

## Files touched
- `src/pages/Alerts.tsx` (edit only)

No other files change. Type-safe against existing `Database['public']['Tables']['coach_action_ledger']` row shape.

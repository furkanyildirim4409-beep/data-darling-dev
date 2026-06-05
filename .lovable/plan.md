# Re-route AI Actions to Ledger + Decision Modal

## A. `src/pages/Alerts.tsx` — Top queue cleanup

1. Delete the entire `{intervention.actions && intervention.actions.length > 0 && (...)}` checklist block (~lines 458–end of that block) including the per-action Done/Dismiss buttons and the `toggleChecklist` / `actionStatus` state plumbing tied to it (only the rendering — keep `AiActionItem` type and the `actions` field on `AiIntervention` because we still need to ship it to the ledger).
2. Remove now-unused icon imports (`Dumbbell`, `Pill`, `UtensilsCrossed`, `MessageSquare`, `CheckCircle2`, `Sparkles`) and the `useNavigate` import if nothing else uses it. Keep `X` only if still referenced.
3. In `handleTriageAction` (the `[Listeye Ekle]` insert), change `suggested_manual_actions: []` to `suggested_manual_actions: intervention.actions ?? []` so the full structured action list (type/title/label/payload/description/is_quantitative) is persisted into `issue_details` JSONB.
4. Top card visual stays: title, severity badge, analysis text, expand-details, and the `[Yok Say]` / `[Listeye Ekle]` popover. Nothing else.

## B. `src/components/dashboard/ActionLedgerDesk.tsx` — Bottom accordion overhaul

1. Add imports: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` from `@/components/ui/dialog`; `useNavigate` from `react-router-dom`; icons `Dumbbell`, `Pill`, `UtensilsCrossed`, `MessageSquare`, `Sparkles`, `Zap`.
2. Extend `LedgerDetails` (or inline in the row): for each pending row, read `issue_details.suggested_manual_actions` as an array of `{ type?, title?, label?, description?, payload? }`. If non-empty, render each as a clickable premium sub-card (icon by type/title text match — program→Dumbbell, supplement→Pill, nutrition/macro→UtensilsCrossed, message/chat→MessageSquare, fallback→Sparkles). Style with `bg-card/60 border-border hover:border-primary/40 hover:bg-primary/5` and an `active:scale-[0.99]` transition.
3. Visually hide an action sub-card (or strike-through + opacity-50) when its title is present in `issue_details.dismissed_actions: string[]`.
4. Component-level state:
   - `const [selectedAction, setSelectedAction] = useState<{ row: LedgerRow; action: ManualAction } | null>(null)`
   - `const [dismissBusy, setDismissBusy] = useState(false)`
5. Sub-card `onClick` → `setSelectedAction({ row, action })`.

## C. Decision Modal (mounted once at component root)

`<Dialog open={!!selectedAction} onOpenChange={(o) => !o && setSelectedAction(null)}>` with `DialogContent` containing:

- Header: icon + `action.title || action.label`, `DialogDescription` showing `action.description` (whitespace-pre-line, max-h with scroll).
- Footer two buttons:
  1. **`[⚡ Profile Git ve Uygula]`** (primary): resolves a tab from action type/title (`program` | `nutrition` | `supplements` | `chat`, default `program`) → `navigate(`/athletes/${selectedAction.row.athlete_id}?tab=${tab}`)`, then `setSelectedAction(null)`.
  2. **`[🔴 Bu Öneriyi Yok Say]`** (destructive variant): async handler:
     - `setDismissBusy(true)`
     - Compute `nextDetails = { ...row.issue_details, dismissed_actions: [...(row.issue_details?.dismissed_actions ?? []), action.title || action.label] }`
     - `await supabase.from("coach_action_ledger").update({ issue_details: nextDetails }).eq("id", row.id)`
     - On success: optimistically patch `rows` state, toast `"Öneri yok sayıldı"`, close modal. On error: toast destructive, keep modal open.

## D. Types & safety

- Local `type ManualAction = { type?: string; title?: string; label?: string; description?: string; payload?: string }` inside `ActionLedgerDesk.tsx`.
- Narrow `issue_details` access via small helper `getActions(details)` and `getDismissed(details)` that guard against non-array values.
- No DB schema changes; `issue_details` is already JSONB.

## Out of scope

- No changes to `AiDoctorRadar`, `executeAiAction`, `MutationConfigDialog`, edge functions, RLS, or migrations.
- No changes to the top queue popover behavior beyond persisting `actions` into the ledger payload.

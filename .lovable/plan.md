# Restore Legacy Action Cards as Manual Checklist (Alerts.tsx)

## Scope
Single file: `src/pages/Alerts.tsx`. No DB schema, no edge function, no other files.

## Changes

### 1. Imports
- Add lucide icons: `Dumbbell`, `Pill`, `UtensilsCrossed`, `MessageSquare`, `CheckCircle2`, `X`, `Sparkles`.
- Add `useNavigate` from `react-router-dom`, initialized as `const navigate = useNavigate();` near other hooks.

### 2. Data shape
- Extend `AiIntervention` type with `actions: Array<{ type: string; label?: string; title?: string; payload?: string; description?: string; is_quantitative?: boolean }>`.
- Update `fetchAiInterventions` Supabase select to include `actions` (currently fetches `id, athlete_id, athlete_name, severity, title, analysis, created_at`). Backend (`ai_weekly_analyses.actions`) already populated by `ai-doctor` edge function with `{ type, label, payload, is_quantitative }`.

### 3. Per-action local checklist state
- Add `const [actionStatus, setActionStatus] = useState<Record<string, "done" | "dismissed">>({})`.
- Key format: `${intervention.id}:${idx}`.
- Pure local state for this session — no DB write (matches spec "or local state tracking for that session"). Avoids polluting `coach_action_ledger` (which is per-insight, not per-sub-action).

### 4. Render the checklist
Inside the existing `aiInterventions.map(...)` card, append the block from the spec **after** the existing "Detaylı Analizi Gör" expand button. Adapt:
- Icon/type detection: support both legacy enum (`program`/`nutrition`/`supplement`/`message`) and the spec's `update_*` variants via `includes()`.
- Display text: `action.label ?? action.title` for title; `action.payload ?? action.description` for subtext.
- Wire Done/Dismiss buttons to `setActionStatus`. Visual states:
  - `done` → opacity-50 + line-through on title, green check filled.
  - `dismissed` → opacity-40 + line-through, red X filled.
  - Buttons remain clickable to toggle back to neutral.
- Deep-link `onClick` calls `navigate(\`/athletes/${intervention.athlete_id}?tab=${targetRoute}\`)`.

### 5. Styling discipline
Replace raw color classes from the spec snippet (`text-blue-400`, `bg-white/[0.02]`, `text-destructive/80`, etc.) with project semantic tokens where the design system has equivalents:
- Containers: `bg-card/40`, `border-border` (matches existing card style in this file).
- Icon colors: keep `text-primary` (program), `text-emerald-500` (nutrition), `text-purple-400` (supplement), `text-warning` (message) — these mirror palettes already used elsewhere in the file (`text-warning`, `text-destructive`, `text-primary`).
- Done button: `text-emerald-500 hover:bg-emerald-500/10`.
- Dismiss button: `text-destructive hover:bg-destructive/10 border-border`.

### 6. Out of scope
- No change to triage popover (Yok Say / Listeye Ekle) — kept as-is.
- No change to `ActionLedgerDesk`, `AiDoctorRadar`, or migrations.
- No re-introduction of `executeAiAction` / `MutationConfigDialog`.

## Technical notes
- `useNavigate` must be called at component top level, not inside the map callback.
- Local state resets when the intervention is triaged out (acceptable — card unmounts).
- Type cast `action` as the local type to keep TS strict-safe; avoid `any`.

# Action Ledger — Preserve & Display Rich AI Analysis

## Problem
When a coach hits **[Listeye Ekle]** on an AI Doktor / Hızlı Müdahale card, only `issue_title` shows up in the ledger desk. The detailed `analysis` body that the AI produced (e.g. "ALT/AST yüksek, şu dozajı el ile ayarla…") is actually already saved into `issue_details.analysis` from `src/pages/Alerts.tsx`, but `ActionLedgerDesk` never renders it, and `AiDoctorRadar` does not save quite as much context. Result: triaged rows look empty and contextless.

No DB migration needed — `issue_details` is already a JSONB column.

## Changes

### 1. `src/pages/Alerts.tsx` — enrich the insert payload
In `triageIntervention`, expand the `issue_details` object passed to `coach_action_ledger.insert` so it captures the full diagnostic context for later rendering:

```
issue_details: {
  description: intervention.analysis,
  detailed_analysis: intervention.analysis,
  athlete_name: intervention.athlete_name,
  severity: intervention.severity,
  created_at: intervention.created_at,
  source: 'alerts_ai_intervention_queue',
  suggested_manual_actions: [],
  biometric_context: '',
}
```

No other logic in `Alerts.tsx` changes.

### 2. `src/components/dashboard/AiDoctorRadar.tsx` — same enrichment for parity
Update the rows built in `handleLedgerAction` so cards triaged from the radar carry the same shape:

```
issue_details: {
  description: i.analysis,
  detailed_analysis: i.analysis,
  severity: i.severity,
  source: 'ai_doctor_radar',
  suggested_manual_actions: [],
  biometric_context: '',
}
```

### 3. `src/components/dashboard/ActionLedgerDesk.tsx` — display the rich body
Inside the per-row `motion.div` (the card that currently only renders `issue_title` + timestamp), add a context block rendered when `r.issue_details` exists:

- Header chip: `🧠 AI TEŞHİS VE MANUEL TAVSİYE NOTU`
- Body paragraph: `issue_details.description ?? issue_details.detailed_analysis ?? issue_details.analysis` (last fallback covers legacy rows already saved with just `analysis`).
- Optional list: when `issue_details.suggested_manual_actions` is a non-empty array, render it as a bulleted "Koç Tarafından Uygulanacak Manuel Adımlar" list, supporting both string entries and `{title}` objects.
- Styling uses existing semantic tokens (`text-foreground/80`, `text-muted-foreground`, `border-border`, `bg-card/40`) — no raw colors, no new design tokens.
- `select-text` to let the coach copy the note.

A small `LedgerDetails` helper component inside the file keeps the JSX readable and the type narrowing tight (no `any` leaks beyond a single safe cast on the JSONB blob).

### 4. Type-safety
- Treat `issue_details` as `Record<string, unknown> | null` (already its declared type in `LedgerRow`) and narrow each field locally with `typeof` / `Array.isArray` checks before rendering. No new global types needed.

## Out of scope
- No DB migration, no schema change.
- No changes to the resolve / fail buttons or realtime subscription.
- No changes to triage filtering logic in `Alerts.tsx` or `AiDoctorRadar.tsx`.

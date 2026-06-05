## Plan: Fix badge placement & isolate positive items in AiHistoryWidget

File: `src/components/athlete-detail/AiHistoryWidget.tsx`

### Context mapping
The spec references "Kritik Bulgular" / "Dikkat Edilmesi Gerekenler" category headers, but this widget doesn't render per-category sections in the card. It renders:
- A 3-tile severity grid (high / medium / low) in the main card
- A Dialog (opened when a tile is clicked) that lists items for the selected severity

So the "category header" the spec wants is the **Dialog header** (one severity at a time) and the severity **tiles** in the grid. The spec's intent translates cleanly to those two places.

### Changes

**A. Strict issue math — exclude `low` (positive)**

Add per-severity helpers:
```ts
const highIssues = sessionInsights.filter(i => i.severity === 'high');
const mediumIssues = sessionInsights.filter(i => i.severity === 'medium');
const countHandled = (arr: AiInsight[]) =>
  arr.filter(i => ledgerMap[i.id] === 'resolved' || ledgerMap[i.id] === 'ignored').length;
const highHandled = countHandled(highIssues);
const mediumHandled = countHandled(mediumIssues);
```

Update `computeProgress` (used by `SessionProgressBadge` in the main `CardHeader` and in each `SelectItem`) to exclude `low`:
```ts
const actionable = items.filter(i => i.severity === 'high' || i.severity === 'medium');
```
This keeps the dropdown/header badge accurate (positives never inflate totals or get counted as "unresolved").

Update the "✅ Bu Raporun Tüm Sorunları Çözüldü" full-width banner gate to also use only actionable items so positives don't block the success state.

**B. Move badge to category headers (= dialog header + severity tiles)**

- **Remove** the `SessionProgressBadge` from the main `CardHeader`'s left cluster (the floating one next to "X tarama kaydı"). Keep it inside each `SelectItem` (still useful for picking a session).
- **Add** a small per-severity badge under each tile in the 3-tile grid for `high` and `medium` only (none for `low`), e.g. `X/Y Çözüldü` in amber, or `✨ Tamamı Çözüldü` in emerald. Shown only when `count > 0`.
- **Add** a per-severity badge in the **Dialog header** (which acts as "Kritik Bulgular" / "Dikkat Edilmesi Gerekenler" header) for `high`/`medium`. For `low`, render no progress badge (positive isn't a problem to resolve).

Badge logic mirrors spec:
- `handled === total` → emerald `✨ Tamamı Çözüldü`
- `0 < handled < total` → amber `{total} Sorundan {handled} Çözüldü`
- Otherwise: nothing

**C. Isolate positive interventions in the dialog list**

In the dialog item `.map`:
- Gate the inline intervention bar (`Müdahale Et` / `Yok Say`) on `(severity === 'high' || severity === 'medium') && !ledgerMap[id]`. Current code only checks the ledger; this adds the severity guard so `low`/positive items never show action buttons.
- Remove the dimmed/clickable styling for `low` items (they're not "handled problems", they're informational). Dimmed style stays only for `high`/`medium` that are resolved/ignored.
- Keep the "Detaylı Analizi Gör/Gizle" toggle for all severities — positives remain fully readable, just read-only.

### Not changing
- Data fetching, `ledgerMap` derivation, `dismissMutation`, `executeAiAction`, `MutationConfigDialog`.
- Severity tile grid structure, dialog open/close flow, expandable analysis.
- `TimelineAI.tsx` — no `interventions`/`ledgerMap` concept; spec doesn't apply there.

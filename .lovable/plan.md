## Goal
Wire the `ledgerMap` from Part 1 into `AiHistoryWidget.tsx`'s render layer so each AI insight visually reflects its lifecycle (pending / resolved / ignored), exposes inline "Müdahale Et" + "Yok Say" actions, and shows a master "all handled" banner per scan session.

## Scope
- Single file: `src/components/athlete-detail/AiHistoryWidget.tsx`
- No DB / edge / hook changes — Part 1 already provides `ledgerMap` and `dismissMutation`
- No changes to `Alerts.tsx`, `ActionLedgerDesk.tsx`, or other components

## Edits

### 1. Imports
- Add `useNavigate` from `react-router-dom`
- Add `Zap`, `XCircle` lucide icons for the action bar
- Inside the component: `const navigate = useNavigate();`

### 2. "All handled" banner (per scan session)
At the top of `<CardContent>` in the main Card (above the 3-tile severity grid), compute against the currently selected session's insights:

```ts
const allHandled =
  sessionInsights.length > 0 &&
  sessionInsights.every(
    (i) => ledgerMap[i.id] === 'resolved' || ledgerMap[i.id] === 'ignored'
  );
```

Render when true:
```tsx
{allHandled && (
  <div className="w-full bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg text-center text-xs font-bold text-emerald-500 tracking-widest uppercase mb-4">
    ✅ Bu Raporun Tüm Sorunları Çözüldü
  </div>
)}
```

### 3. Per-insight rendering inside the severity Dialog
The detail list lives in the `<Dialog>` → `filteredBySelection.map((insight) => ...)` block (around the current insight card). For each insight derive:

```ts
const status = ledgerMap[insight.id];
const isHandled = status === 'resolved' || status === 'ignored';
```

**A. Dimming wrapper** — apply conditionally on the outer `<div>`:
```
className={`rounded-lg border border-border bg-card p-4 border-l-4 ${config.borderColor} ${
  isHandled ? 'opacity-50 grayscale-[0.2] pointer-events-none transition-all' : ''
}`}
```

**B. Status badge** next to the title (inline with `insight.title`):
```tsx
{status === 'resolved' && (
  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 ml-2">
    🟢 Çözüldü
  </Badge>
)}
{status === 'ignored' && (
  <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/20 ml-2">
    ⚪ Yok Sayıldı
  </Badge>
)}
```

**C. Existing action buttons block** (`insight.actions.map(...)`) — wrap in `{!isHandled && insight.actions.length > 0 && (...)}` so dimmed items show no AI-action buttons.

**D. New inline action bar** — render only when `!isHandled`, placed after the existing action buttons row and before the "Detaylı Analizi Gör" toggle:
```tsx
{!isHandled && (
  <div className="flex items-center gap-2 mt-2 mb-2">
    <Button
      size="sm"
      variant="outline"
      className="text-[10px] gap-1 px-2 py-0.5 border-primary/30 text-primary hover:bg-primary/10"
      onClick={() => navigate('/alerts')}
    >
      <Zap className="w-3 h-3" />
      Müdahale Et
    </Button>
    <Button
      size="sm"
      variant="outline"
      className="text-[10px] gap-1 px-2 py-0.5 border-destructive/30 text-destructive hover:bg-destructive/10"
      onClick={() => dismissMutation.mutate(insight)}
      disabled={dismissMutation.isPending}
    >
      <XCircle className="w-3 h-3" />
      Yok Say
    </Button>
  </div>
)}
```

### 4. Untouched
- Session selector, severity tiles, empty/loading states, `executeAiAction` flow, `MutationConfigDialog`, expand/collapse analysis, `actionTypeIcons`/`actionColors` maps — all unchanged.
- The Part 1 hooks (`ledgerMap`, `dismissMutation`, query invalidation) need no edits; dismissing an item refetches the ledger and the row auto-dims on next render.

## Verification
- Load an athlete profile with at least one prior AI scan session.
- Open severity dialog → confirm pending insights show both buttons, dismissed ones become dimmed + "⚪ Yok Sayıldı" badge instantly after clicking Yok Say.
- When every insight in a session is resolved/ignored, the emerald banner appears at the top of the AI Tarama Geçmişi card.
- "Müdahale Et" navigates to `/alerts`.
- No console / TS errors.

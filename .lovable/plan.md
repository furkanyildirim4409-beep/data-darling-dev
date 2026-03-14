

## AI History Widget: Modal Integration

### Problem
The inline detail cards (lines 250-278) dump full analysis text directly on the page, causing cognitive overload.

### Changes — Single File: `src/components/athlete-detail/AiHistoryWidget.tsx`

**1. Add imports**: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from ui/dialog, `ScrollArea` from ui/scroll-area.

**2. Add state**: `selectedSeverity: SeverityKey | null` (default `null`).

**3. Make summary cards clickable**: Convert the `<div>` cards (lines 226-246) to `<button>` elements with `onClick={() => count > 0 && setSelectedSeverity(severity)}`, `disabled={count === 0}`, `cursor-pointer`, hover ring effect (`ring-0 hover:ring-2 ${config.ringColor}`), and `disabled:opacity-50 disabled:cursor-default`. Matches `AiDoctorRadar.tsx` pattern exactly.

**4. Remove inline detail cards**: Delete lines 250-278 (the `space-y-3` div mapping `sessionInsights`).

**5. Add Dialog**: After the closing `</Card>`, render:
```
<Dialog open={!!selectedSeverity} onOpenChange={() => setSelectedSeverity(null)}>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle> [severity icon] + [severity label] + " Bulgular" </DialogTitle>
    </DialogHeader>
    <ScrollArea className="max-h-[60vh]">
      {filtered insights mapped as cards with severity left-border, icon, bold title, full analysis text}
    </ScrollArea>
  </DialogContent>
</Dialog>
```

**6. Wrap return in fragment** (`<>...</>`) to accommodate sibling `Card` + `Dialog`.

### No other files changed.


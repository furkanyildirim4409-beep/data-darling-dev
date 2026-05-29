# Isolate Terminated Sheet Trigger Inside Packages Tab

## Changes — `src/pages/StoreManager.tsx`

### 1. Remove button from global tab header (lines 286–299)
Strip the `<Button>` for "Feshedilen Sporcular Geçmişi" out of the flex row that wraps `TabsList`. Collapse the wrapper back to just `<TabsList>` (no longer needs the flex justify-between div).

### 2. Add header row + button inside `TabsContent value="coaching_packages"` (line 684)
Replace the bare wrapper with a header row + body:

```tsx
<TabsContent value="coaching_packages" className="space-y-6 mt-0 animate-in fade-in duration-200">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-4">
    <div>
      <h2 className="text-lg font-bold uppercase tracking-wider text-foreground">Abonelik & Koçluk Paketleri</h2>
      <p className="text-xs text-muted-foreground">Premium satış hizmetlerinizi zengin içeriklerle yapılandırın.</p>
    </div>
    <Button variant="outline" onClick={() => setTerminatedSheetOpen(true)} className="...same classes...">
      <UserX className="w-3.5 h-3.5" /> Feshedilen Sporcular Geçmişi
    </Button>
  </div>
  <CoachingPackagesManager />
</TabsContent>
```

### 3. Keep the `<Sheet>` definition outside the tabs (current location ~line 689) — unchanged
Only the trigger button moves; the Sheet itself stays at root so it overlays correctly regardless of active tab. State (`terminatedSheetOpen`) is already at the page level.

## Out of scope
- No changes to `TerminatedAthletesPanel`, query logic, or other tabs.

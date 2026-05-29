## Liberate the Packages tab + tuck Terminated list into a Sheet

Single file: `src/pages/StoreManager.tsx`.

### Changes

1. **Tab row** (line ~277) — wrap `TabsList` and the new trigger button in a flex row so the button sits at the upper-right of the tab bar:
   ```tsx
   <div className="flex items-center justify-between gap-3">
     <TabsList className="glass border border-border"> … </TabsList>
     <Button onClick={() => setTerminatedSheetOpen(true)}
       variant="outline"
       className="border-white/5 bg-white/[0.01] hover:bg-white/5 text-muted-foreground hover:text-foreground text-xs rounded-xl gap-2 h-9 px-3">
       <UserX className="w-3.5 h-3.5" /> Feshedilen Sporcular Geçmişi
     </Button>
   </div>
   ```
   Add `const [terminatedSheetOpen, setTerminatedSheetOpen] = useState(false);` in the parent component.

2. **Coaching packages tab content** (lines 666–673) — drop the 2-column grid and `<TerminatedAthletesPanel />`. The tab now renders `<CoachingPackagesManager />` full-width so the Package HUB owns 100% of the canvas.

3. **Side Sheet** — render once at the end of the page JSX (alongside the existing dialogs):
   ```tsx
   <Sheet open={terminatedSheetOpen} onOpenChange={setTerminatedSheetOpen}>
     <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
       <SheetHeader className="p-5 border-b border-border">
         <SheetTitle className="flex items-center gap-2">
           <UserX className="w-4 h-4 text-destructive" /> Feshedilen Sporcular
         </SheetTitle>
         <SheetDescription>Geçmiş fesihler ve geri alma işlemleri.</SheetDescription>
       </SheetHeader>
       <div className="flex-1 overflow-y-auto">
         <TerminatedAthletesPanel variant="sheet" />
       </div>
     </SheetContent>
   </Sheet>
   ```

4. **`TerminatedAthletesPanel` refactor:**
   - Add `variant?: "card" | "sheet"` prop; in `sheet` mode skip the outer `glass rounded-xl border` wrapper + header (Sheet provides them) and remove the `max-h-[520px]` scroll cap (Sheet body handles scroll).
   - Extend the select to include `freeze_reason` (existing column, see `handleUnfreezeAthlete` memory) and render a small muted reason line under the severance date when present:
     ```tsx
     {r.freeze_reason && <p className="text-[11px] text-muted-foreground/80 truncate italic">"{r.freeze_reason}"</p>}
     ```
   - Update `TerminatedRow` type accordingly.

5. **Imports** — add `Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription` from `@/components/ui/sheet`. `UserX`, `Button`, `useState` already imported.

### Out of scope
- No DB changes, no edits to other pages, no changes to the reinstate mutation logic itself.
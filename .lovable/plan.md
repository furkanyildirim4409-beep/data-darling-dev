# Empty-state CTA + History Layout Lock

## 1. ProgramTab.tsx — inline assign dialog instead of navigation

The empty state (lines 424–436) currently routes to `/programs` via `navigate()`. Replace with the same inline `AssignTrainingDialog` flow used by the dashboard cards.

- Import `AssignTrainingDialog` from `@/components/athlete-detail/AssignTrainingDialog`.
- Add local state `const [assignTrainingOpen, setAssignTrainingOpen] = useState(false);`.
- In the empty-state block:
  - Heading stays as `"Atanmış Bir Antrenman Bulunmuyor"` (updated copy per spec).
  - Replace the "Program Mimarı'na Git" button with a primary `"Antrenman Programı Ata"` button (`Plus` icon) whose `onClick` does `setAssignTrainingOpen(true)`.
  - Wrap in the existing `glass rounded-xl border border-border p-12 text-center` container — no layout change.
- Render `<AssignTrainingDialog open={assignTrainingOpen} onOpenChange={setAssignTrainingOpen} athleteId={athleteId} onAssigned={() => { setAssignTrainingOpen(false); /* trigger existing refetch */ }} />` at the end of the empty-state JSX block (and at the bottom of the main return so it works from both branches).
- Hook `onAssigned` into whatever refresh path the file already exposes (likely `fetchPrograms()` based on prior edits). Confirm and reuse it.
- Leave `useNavigate` import only if it's still used elsewhere; otherwise drop the import.

## 2. WorkoutHistoryTab.tsx — height-locked container for filter refetches

Currently three return branches (`loading` skeleton, `!logs.length` empty, results list) swap the entire subtree, so changing a date filter momentarily renders a different-height block and the page scrolls.

Restructure to a single stable container:

```tsx
return (
  <div>
    {filterBar}
    <div className="w-full min-h-[460px] flex flex-col relative transition-all duration-300">
      {loading && (
        <div className="absolute inset-0 bg-background/20 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {!loading && logs.length === 0 ? (
        <div className="glass rounded-xl border border-border p-12 text-center flex-1 flex flex-col items-center justify-center">
          <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">
            {quickRange !== "all" ? "Bu tarih aralığında antrenman kaydı bulunamadı." : "Henüz tamamlanmış antrenman kaydı yok."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => ( /* unchanged collapsible row */ ))}
        </div>
      )}
    </div>
  </div>
);
```

- Remove the early `if (loading)` and `if (!logs.length)` returns; collapse all three branches into the single render above.
- Keep stale `logs` visible underneath the overlay during refetch so the box does not collapse to 0 height. The `min-h-[460px]` floor guarantees the page never jolts.
- Import `Loader2` from `lucide-react` if not already imported.
- Preserve all existing collapsible row markup; only the wrapper structure changes.

## Out of scope
- No data-fetch logic changes.
- No backend or schema changes.
- No edits to ActiveBlocks or other tabs.

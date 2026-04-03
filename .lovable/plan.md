

## Move Supplements to Program Builder

### Problem
SupplementsPanel is currently buried in the "Genel" (General) tab's DraggableCardLayout. The user wants it in the "Antrenman Programı" (Program) tab alongside workout programs.

### Changes

**1. `src/pages/AthleteDetail.tsx`**
- Remove `"supplements-panel": <SupplementsPanel>` from the DraggableCardLayout cards object (line 249)
- Remove the SupplementsPanel import (line 27)
- Add SupplementsPanel import to be used in the program tab
- In the `program` TabsContent (line 254-256), wrap ProgramTab and SupplementsPanel together:
```tsx
<TabsContent value="program" className="mt-6">
  <div className="space-y-6">
    <ProgramTab athleteId={athlete.id} currentProgram="Program" />
    <SupplementsPanel athleteId={athlete.id} />
  </div>
</TabsContent>
```

**2. No other file changes needed**
- `SupplementsPanel` already has the "Takviye Ata" button, supplement list, delete/toggle actions, and the `AssignSupplementDialog` integration
- It renders as a standalone Card component, so placing it below ProgramTab will display it as a prominent section in the program builder view

### Result
The Supplement Program card with its "Takviye Ata" button will appear directly below the workout programs on the "Antrenman Programı" tab — exactly where coaches manage training architecture.


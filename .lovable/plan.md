

## ActiveBlocks → Single "Programlar" Card

### Problem
The drag handle from `DraggableCardLayout` and the `MoreVertical` dropdown both use `absolute top-3 right-3`, causing them to overlap visually.

### Solution
Wrap the entire ActiveBlocks component in a single `Card` with a "Programlar" header. Move training and diet into sub-sections inside this card. Inline the 3-dot menus per sub-section so they don't conflict with the drag handle.

### UI Design
```text
┌─────────────────────────────────┐
│  Programlar              [grip] │  ← Card header + drag handle (from layout)
│─────────────────────────────────│
│  🏋 Program Name    Hafta 2/4 ⋮│  ← Training row, inline menu
│  ████████░░░░░░  %25           │  ← Progress bar
│─────────────────────────────────│
│  🍎 Diet Name      Hafta 1/8  ⋮│  ← Diet row, inline menu  
│  ████░░░░░░░░░░  %12           │  ← Progress bar
│  2100 kcal · 180g P · 250g K   │  ← Compact macro line
└─────────────────────────────────┘
```

### Changes (single file)

**`src/components/athlete-detail/ActiveBlocks.tsx`**
- Remove the outer `space-y-4` div with two separate glass cards
- Wrap everything in a single `Card` with `CardHeader` showing "Programlar" title
- Training section: compact row with icon, name, week badge, and inline `MoreVertical` dropdown (no absolute positioning)
- Diet section: same compact row pattern, separated by a `Separator`
- Macros shown as a single inline text line instead of a 4-column grid
- Keep all existing logic (dialogs, CRUD, data fetching) unchanged
- Remove `relative` + `absolute top-3 right-3` from dropdown triggers — use flex layout instead


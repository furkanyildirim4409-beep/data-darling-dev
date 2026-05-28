# Repair İşlemler Hover Text Occlusion

## Problem
In `AthleteTableRow.tsx`, the two action buttons ("Mesaj" icon + "Görüntüle") use `variant="ghost"` from shadcn Button, which applies `hover:bg-accent hover:text-accent-foreground`. Because the design system maps `--accent` to the neon-lime primary and `--accent-foreground` to black, on hover the button fills with lime AND the icon/text becomes black — but combined with the existing `text-muted-foreground hover:text-primary` override, the result is a lime-on-lime collision that erases the label.

## Fix

### `src/components/athletes/AthleteTableRow.tsx` — Actions cell only
Replace both shadcn `<Button variant="ghost">` instances with native `<button>` elements styled as glass-accent pills so we bypass the ghost variant's `hover:bg-accent hover:text-accent-foreground` rule entirely.

Shared class string for both buttons:
```
relative inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl
border border-white/5 bg-white/[0.02]
text-foreground text-xs font-semibold tracking-wide
transition-all duration-200
hover:bg-primary/10 hover:border-primary/40 hover:text-primary
cursor-pointer select-none
```

Inner `<MessageSquare />`, `<User />`, `<ChevronRight />` icons and label spans get `transition-colors duration-200` so they smoothly inherit the parent's `hover:text-primary` without ever flipping to `accent-foreground` (black).

The unanswered ping badge (`absolute -top-0.5 -right-0.5 …`) stays as-is on the message button.

The outer wrapper keeps `flex items-center gap-2 whitespace-nowrap opacity-100` — no layout shift, no scale transforms.

### `src/components/athletes/AthleteRoster.tsx`
No changes needed — the filter `<Badge>` chips already use explicit semantic colors and aren't part of the "İşlemler" cluster. The user mentioned the file for completeness but only the row-level action buttons exhibit the bug.

## Out of scope
- No business logic, query, or data changes.
- No modification to other ghost buttons elsewhere in the app.
- No changes to the badge variants or table layout.

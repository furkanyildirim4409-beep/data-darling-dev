# Messages Layout Fixes & Direct Tab Badge (Part 4/5)

## Problem

1. `MainLayout` wraps every route's `<main>` in `p-4 md:p-6` + `overflow-auto`. On `/messages` this creates the unwanted "safe area" gap below the top bar and lets the whole page scroll, dragging the input box around.
2. Inside Messages the `<Tabs>` root uses `h-[calc(100vh-4rem)]` which is wrong because the page is already inside a padded, scrollable `<main>` — the height calc fights the outer container.
3. The "Sporcular" (Direct) tab trigger has no unread badge, even though `useCoachChat` already exposes per-athlete `unreadCount`.

## Fix

### A. MainLayout — route-aware padding
File: `src/components/layout/MainLayout.tsx`

- Detect full-bleed routes with `useLocation()`.
- For `/messages` (and any future chat-style routes) render the `<Outlet />` directly inside `<main>` with `overflow-hidden` and no padding. All other routes keep the existing `p-4 md:p-6` + `overflow-auto` behavior.

```tsx
const { pathname } = useLocation();
const isFullBleed = pathname.startsWith("/messages");

<main className={cn(
  "flex-1 grid-pattern scrollbar-thin mobile-scroll min-h-0",
  isFullBleed ? "overflow-hidden" : "overflow-auto"
)}>
  {isFullBleed
    ? <Outlet />
    : <div className="p-4 md:p-6"><Outlet /></div>}
</main>
```

This removes the gap and stops the outer scroll without absolute positioning.

### B. Messages.tsx — strict flex column, no viewport math
File: `src/pages/Messages.tsx`

- Replace `h-[calc(100vh-4rem)]` with `h-full` on the `<Tabs>` root (since `<main>` is now a sized flex child).
- Keep `flex flex-col overflow-hidden`. Tab header stays `flex-shrink-0`. Each `<TabsContent>` keeps `flex-1 overflow-hidden m-0 p-0` so children can own their internal scroll.
- Compute direct unread count from `athletes`:
  ```ts
  const directUnread = athletes.reduce((s, a) => s + (a.unreadCount || 0), 0);
  ```
- Render the badge inside the "Sporcular" trigger:
  ```tsx
  <TabsTrigger value="athletes" className="gap-1.5 ...">
    <MessageCircle className="w-4 h-4" />
    Sporcular
    {directUnread > 0 && (
      <Badge className="ml-2 bg-red-500 text-white rounded-full h-5 min-w-5 flex items-center justify-center p-0 text-[10px] font-bold border-0">
        {directUnread > 9 ? "9+" : directUnread}
      </Badge>
    )}
  </TabsTrigger>
  ```

### C. Chat panes — guarantee fixed input bar
Files: `src/components/chat/ActiveChat.tsx`, `src/components/messages/TeamChatInterface.tsx`

These already use `flex flex-col h-full` with a `flex-1 overflow-y-auto` message list and a static input bar. Once MainLayout stops adding outer scroll, the input pins correctly. We add two small guards:

- Add `min-h-0` to the messages scroll container (`<div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto …">`) in both files so flex correctly constrains the scroll region inside the column.
- Ensure each pane's outer wrapper is `h-full overflow-hidden flex flex-col` (already true in `ActiveChat`; `TeamChatInterface`'s `chatPane` is fine, just add `overflow-hidden`).

### D. Desktop two-pane wrappers
- In `Messages.tsx` `athleteChatDesktopView`, change `<div className="flex h-full">` to `<div className="flex h-full overflow-hidden">` so the inner sidebar/chat each scroll independently.
- Same for `TeamChatInterface`'s desktop return.

## Out of scope
- No changes to `useCoachChat` / `useTeamChat` data layer.
- No new realtime queries — we reuse the existing `unreadCount` already computed for Direct.
- "Channels / Groups" tabs don't exist in this codebase; only the two existing tabs (Sporcular = Direct, Ekip İçi = Team) are present, so the badge goes on "Sporcular".

## Files touched
- `src/components/layout/MainLayout.tsx`
- `src/pages/Messages.tsx`
- `src/components/chat/ActiveChat.tsx`
- `src/components/messages/TeamChatInterface.tsx`

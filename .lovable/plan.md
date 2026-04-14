

## Epic 7 - Part 7: Mailbox Shell & Navigation

### Summary
Create the Mailbox page with a split-pane email client layout, add it to the sidebar navigation with an unread badge, and register the route.

### Step A — Add to Sidebar Navigation
**File: `src/components/layout/AppSidebar.tsx`**
- Import `Mail` from lucide-react
- Add nav item after "Mesajlar": `{ path: "/mailbox", label: "Mail Kutusu", icon: Mail, showMailBadge: true }`
- Add unread email badge logic: query `emails` table for unread inbound count, display badge similar to existing message/alert badges

### Step B — Create Unread Email Hook
**File: `src/hooks/useUnreadEmails.ts`**
- Create a simple hook that queries `supabase.from('emails').select('id', { count: 'exact', head: true }).eq('is_read', false).eq('direction', 'inbound')` filtered by current user's `owner_id`
- Returns `unreadCount` number
- Uses react-query for caching/refetching

### Step C — Create Mailbox Page
**File: `src/pages/Mailbox.tsx`**
- State: `activeTab: 'inbound' | 'outbound'` defaulting to `'inbound'`
- Two-column layout using a left sidebar panel (~250px) and right content area:
  - **Left panel**: "Yeni Mail" compose button (prominent, primary color), folder list with "Gelen Kutusu" and "Gönderilenler" items, active state highlighting
  - **Right panel**: Placeholder text "Bir klasör seçin veya e-posta görüntüleyin." (to be populated in Part 8)
- Dark theme consistent with existing app design

### Step D — Register Route
**File: `src/App.tsx`**
- Import `Mailbox` page
- Add `<Route path="/mailbox" element={<Mailbox />} />` inside the coach-protected layout routes

### Files
| File | Action |
|------|--------|
| `src/hooks/useUnreadEmails.ts` | CREATE |
| `src/pages/Mailbox.tsx` | CREATE |
| `src/components/layout/AppSidebar.tsx` | EDIT — add Mail Kutusu nav item + badge |
| `src/App.tsx` | EDIT — add /mailbox route |


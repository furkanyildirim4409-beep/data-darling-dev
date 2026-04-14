

## Epic 7 - Part 8: Inbox Reading View

### Summary
Create the email fetching hook with mark-as-read mutation, build a master-detail layout within the Mailbox right panel to list and read emails.

### Step A — Create useEmails Hook
**File: `src/hooks/useEmails.ts`** (CREATE)
- Accept `direction: 'inbound' | 'outbound'`
- Query `emails` table filtered by `owner_id`, `direction`, ordered by `created_at desc`
- Include `markAsRead` mutation: updates `is_read = true`, invalidates both `["emails", ...]` and `["unread-emails"]` query keys
- Use React Query with `useQuery` + `useMutation`

### Step B — Update Mailbox Page with Master-Detail Layout
**File: `src/pages/Mailbox.tsx`** (EDIT)
- Add state: `selectedEmailId: string | null`
- Split the right content area into two columns on desktop (list + detail), stacked on mobile
- **Email List Panel** (~350px, scrollable):
  - Map over emails from `useEmails(activeTab)`
  - Each row shows: sender/recipient, subject (truncated), relative date
  - Unread inbound emails: bold text + primary dot indicator
  - On click: set `selectedEmailId`, call `markAsRead` if unread
  - Active/selected row gets subtle highlight
- **Detail Panel** (flex-1):
  - If no email selected: placeholder text
  - If selected: header (subject, from, to, date) + body rendered via `dangerouslySetInnerHTML` with `body_html`, falling back to `body_text` wrapped in `<pre>` for plain text
  - Contained in a scrollable area with basic prose-like styling
- Reset `selectedEmailId` to `null` when `activeTab` changes

### Files
| File | Action |
|------|--------|
| `src/hooks/useEmails.ts` | CREATE |
| `src/pages/Mailbox.tsx` | EDIT — add master-detail layout with email list and reading view |

### Technical Notes
- `dangerouslySetInnerHTML` is acceptable here since emails are stored server-side from Resend; no user-generated script injection path
- Invalidating `["unread-emails"]` on markAsRead ensures the sidebar badge updates instantly
- Date formatting: use `toLocaleDateString('tr-TR')` for dates, `toLocaleTimeString` for today's emails




## Epic 7 - Part 9: Compose Outbound Mail

### Summary
Build a compose dialog, a new Edge Function that sends email via Resend and logs it to the `emails` table, and wire them together with a mutation hook.

### Step A — Create ComposeMailDialog Component
**File: `src/components/mailbox/ComposeMailDialog.tsx`** (CREATE)
- Dialog with props `open`, `onOpenChange`
- Form fields: "Kime" (to email, validated), "Konu" (subject), "Mesaj" (textarea body)
- On submit: call the compose mutation from `useEmails` hook
- Show loading state on send button, close dialog + toast on success

### Step B — Create send-custom-email Edge Function
**File: `supabase/functions/send-custom-email/index.ts`** (CREATE)
- CORS headers + OPTIONS handler
- Extract user ID from JWT via `supabase.auth.getUser()` (using the Authorization header)
- Validate payload: `toEmail`, `subject`, `bodyText`
- Fetch coach profile (full_name, username) from `profiles` table using service role client
- Send email via Resend direct API (`RESEND_DIRECT_API_KEY`):
  - `from: "${coachName} <${coachUsername}@dynabolic.co>"`
  - Convert `bodyText` newlines to `<br>` for HTML
- Insert outbound record into `emails` table using service role client:
  - `owner_id`, `direction: 'outbound'`, `from_email`, `to_email`, `subject`, `body_text`, `body_html`, `is_read: true`
- Return success/error response

### Step C — Add Compose Mutation to useEmails
**File: `src/hooks/useEmails.ts`** (EDIT)
- Add `useSendEmail` export (or add mutation inside existing hook)
- Invokes `send-custom-email` Edge Function
- On success: invalidate `["emails"]` queries, return for toast/close handling

### Step D — Wire Compose Button in Mailbox
**File: `src/pages/Mailbox.tsx`** (EDIT)
- Import `ComposeMailDialog`
- Add `composeOpen` state
- Connect "Yeni Mail" button `onClick` to open dialog
- Render `<ComposeMailDialog open={composeOpen} onOpenChange={setComposeOpen} />`

### Files
| File | Action |
|------|--------|
| `src/components/mailbox/ComposeMailDialog.tsx` | CREATE |
| `supabase/functions/send-custom-email/index.ts` | CREATE |
| `src/hooks/useEmails.ts` | EDIT — add compose mutation |
| `src/pages/Mailbox.tsx` | EDIT — wire compose dialog |

### Notes
- Coach profile (name, username) is fetched server-side from JWT user ID — no need to pass from client
- `RESEND_DIRECT_API_KEY` already exists as a secret
- Deploy the Edge Function after creation


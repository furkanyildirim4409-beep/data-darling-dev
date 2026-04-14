

## Epic 7 - Part 6: Inbound Email Webhook

### Summary
Create an Edge Function that receives Resend inbound webhook POSTs, maps the recipient to a coach via username lookup, and inserts the email into the `emails` table.

### Step A — Create Edge Function
**File: `supabase/functions/inbound-email/index.ts`**
- Standard CORS headers + OPTIONS handler
- Initialize Supabase client with `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
- Parse JSON payload: extract `from`, `to`, `subject`, `text`, `html`
- Extract clean email from `to` (handle formats like `"Name <user@dynabolic.co>"` and arrays)
- Extract username prefix from the `@dynabolic.co` address
- Query `profiles` table: `.select('id').eq('username', extractedUsername).maybeSingle()`
- If no profile found: log warning, return `200 OK` (prevent Resend retries)
- If found: insert into `emails` table with `direction: 'inbound'`, `is_read: false`
- Return `200 OK` with `{ success: true }`

### Step B — Update config.toml
**File: `supabase/config.toml`**
- Add `[functions.inbound-email]` with `verify_jwt = false`

### Files
| File | Action |
|------|--------|
| `supabase/functions/inbound-email/index.ts` | CREATE |
| `supabase/config.toml` | EDIT — add inbound-email function config |

### Notes
- No migration needed — the `emails` table already exists with the correct schema
- Service role key (`SUPABASE_SERVICE_ROLE_KEY`) is already configured as a secret
- After deployment, the user will need to configure the webhook URL (`https://fsbhbfltathfcpvcjfzt.supabase.co/functions/v1/inbound-email`) in their Resend dashboard under Webhooks → Inbound


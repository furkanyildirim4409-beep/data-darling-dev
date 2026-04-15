

## Epic 9 - Part 3: Automation Engine (Welcome Email)

### Summary
Create `handle-automation` Edge Function triggered by a Database Webhook on `team_members` INSERT. It sends the "Hoş Geldin (Kurumsal)" system template to the new member via Resend and logs the outbound email. No SQL migration needed — webhook configured manually via Dashboard.

### Step A — Create `supabase/functions/handle-automation/index.ts` (NEW)

- CORS preflight handler
- No JWT auth (webhook-triggered, `verify_jwt = false`)
- Parse webhook payload → extract `record.user_id` and `record.head_coach_id`
- Admin client via `SUPABASE_SERVICE_ROLE_KEY`
- Fetch new member's `full_name` + `email` from `profiles`
- Fetch head coach's `full_name` + `username` from `profiles`
- Fetch system template: `name = 'Hoş Geldin (Kurumsal)' AND is_system = true`
- Replace `{{isim}}` in `subject` and `body_html`
- Send via Resend (`RESEND_DIRECT_API_KEY`), from `CoachName <username@dynabolic.co>`
- Insert into `emails` table (owner_id = head_coach_id, direction = outbound, is_read = true)
- Always return 200 to prevent webhook retries on data issues

### Step B — Update `supabase/config.toml` (EDIT)

Append:
```toml
[functions.handle-automation]
verify_jwt = false
```

### Files

| File | Action |
|------|--------|
| `supabase/functions/handle-automation/index.ts` | CREATE |
| `supabase/config.toml` | EDIT — add function config |

No SQL migration. Webhook will be configured manually via Dashboard.


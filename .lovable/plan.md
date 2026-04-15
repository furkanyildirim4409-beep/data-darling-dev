

## Epic 10 - Part 3: Core Lifecycle Automation (Welcome Email)

### Summary
Create `trigger-welcome-email` Edge Function that uses the "Premium Hoş Geldin" visual template (seeded in Part 1) with full variable replacement including `{{baslangic_linki}}`. This is structurally similar to the existing `handle-automation` function but targets the new premium template and handles additional variables.

### Analysis

The existing `handle-automation` function already handles team_members INSERT webhooks using the older "Hoş Geldin (Kurumsal)" template with only `{{isim}}` replacement. The new function targets the "Premium Hoş Geldin" template which requires two variables: `{{isim}}` and `{{baslangic_linki}}`.

### Step A — Create `supabase/functions/trigger-welcome-email/index.ts` (NEW)

Based on the proven `handle-automation` pattern:
- CORS preflight handler
- No JWT (webhook-triggered)
- Parse webhook payload → `record.user_id` and `record.head_coach_id`
- Admin client via `SUPABASE_SERVICE_ROLE_KEY`
- Fetch member's `full_name` + `email` from `profiles`
- Fetch coach's `full_name` + `username` from `profiles`
- Fetch template: `name = 'Premium Hoş Geldin' AND is_system = true`
- Replace both variables:
  - `{{isim}}` → member's `full_name`
  - `{{baslangic_linki}}` → `https://app.dynabolic.co/login`
- Send via Resend (`RESEND_DIRECT_API_KEY`), from `CoachName <username@dynabolic.co>`
- Log to `emails` table (owner_id = head_coach_id, direction = outbound, is_read = true)
- Always return 200 to prevent webhook retries

### Step B — Update `supabase/config.toml` (EDIT)

Append:
```toml
[functions.trigger-welcome-email]
verify_jwt = false
```

### Files

| File | Action |
|------|--------|
| `supabase/functions/trigger-welcome-email/index.ts` | CREATE |
| `supabase/config.toml` | EDIT — add function config |

No SQL migration. Webhook configured manually via Dashboard.


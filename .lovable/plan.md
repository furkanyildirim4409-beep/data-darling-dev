

## Epic 10 - Part 5: Retention CRON Engine (Expiration Reminders)

### Summary
Add an `expires_at` column to `orders`, create a CRON-triggered Edge Function that scans for expiring subscriptions (3 days out) and sends the "Üyelik Yenileme Hatırlatması" visual template via Resend.

### Step A — Migration: Add `expires_at` to `orders`

```sql
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS expires_at timestamptz;
```

No RLS changes needed — existing policies already cover SELECT/INSERT on orders.

### Step B — Create `supabase/functions/cron-retention-reminders/index.ts` (NEW)

CRON-triggered function (no webhook payload):

1. Initialize Admin client (`SUPABASE_SERVICE_ROLE_KEY`)
2. Query orders where `expires_at` is between `now()` and `now() + interval '3 days'` AND `expires_at > now()` AND status IN ('active', 'paid') — catches the 3-day window
3. For each matched order:
   - Fetch user profile (`full_name`, `email`) from `profiles`
   - Calculate `kalan_gun` = `ceil(extract(epoch from expires_at - now()) / 86400)`
   - Fetch "Üyelik Yenileme Hatırlatması" template (`is_system = true`)
   - Replace `{{isim}}`, `{{kalan_gun}}`, `{{yenileme_linki}}` (`https://app.dynabolic.co/pricing`)
   - Send via Resend from `Dynabolic Destek <support@dynabolic.co>`
   - Log to `emails` table (owner_id = user_id, direction = 'outbound')
4. Return summary: `{ sent: N, errors: M }`
5. Always return 200

### Step C — Update `supabase/config.toml` (EDIT)

```toml
[functions.cron-retention-reminders]
verify_jwt = false
```

### Technical Notes

- The template fetched once per invocation (not per user) for efficiency
- Deduplication: query filters `expires_at` to a 24-hour window (`BETWEEN now() + interval '2 days' AND now() + interval '3 days'`) so daily CRON doesn't re-send
- `pg_cron` schedule configured manually by CTO (recommended: daily at 09:00 Istanbul time)

### Files

| File | Action |
|------|--------|
| Migration SQL | CREATE — add `expires_at` column |
| `supabase/functions/cron-retention-reminders/index.ts` | CREATE |
| `supabase/config.toml` | EDIT — add function config |

No UI changes. No DB trigger. CRON schedule configured manually.


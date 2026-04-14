

## Epic 7 - Part 1: DB Architecture for Custom Mailbox

### Summary
Add a `username` column to `profiles` for custom email prefixes (`username@dynabolic.co`) and create an `emails` table as the internal mailbox for coaches/sub-coaches.

### Migration SQL

**Step 1 — Add `username` to `profiles`**
- `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text`
- Add a `UNIQUE` constraint to prevent duplicates

**Step 2 — Create `emails` table**
- Columns: `id`, `owner_id` (FK to profiles), `direction` (inbound/outbound), `from_email`, `to_email`, `subject`, `body_html`, `body_text`, `is_read`, `created_at`
- Use a validation trigger instead of a CHECK constraint for `direction` (per Supabase guidelines — CHECK constraints can cause restoration issues)

**Step 3 — RLS on `emails`**
- Enable RLS
- Single permissive ALL policy: `auth.uid() = owner_id`
- Head coaches should also see emails of their sub-coaches, so add a second SELECT policy using `is_active_team_member_of` for agency visibility

**Step 4 — Index**
- Index on `emails(owner_id, created_at DESC)` for fast mailbox queries

### Files affected
| Resource | Action |
|----------|--------|
| Database migration | CREATE — adds `username` column + `emails` table + RLS + trigger + index |
| `src/integrations/supabase/types.ts` | Auto-regenerated after migration |

### Notes
- No UI changes in this part — database foundation only
- The `direction` validation uses a trigger rather than a CHECK constraint per Supabase best practices
- Service role (webhooks) bypasses RLS automatically for inbound email insertion




## Plan: Update Master Email Templates with High-End HTML

### Summary
Create a SQL migration to update the `Premium Hoş Geldin` (athlete) and `Kaptan Hoş Geldin` (coach) email templates with production-ready, high-conversion HTML designs using PostgreSQL dollar-quoting for safe HTML injection.

### Files to Create
| File | Action |
|------|--------|
| `supabase/migrations/[timestamp]_update_master_email_templates.sql` | CREATE — migration with UPDATE statements |

### SQL Content
The migration will contain two UPDATE statements:
1. Update `body_html` for `name = 'Premium Hoş Geldin'` with athlete welcome template
2. Update `body_html` for `name = 'Kaptan Hoş Geldin'` with coach welcome template

Both use `$$` dollar-quoting to safely embed complex HTML without escaping issues.

### Notes
- Using exact SQL provided by user
- Dollar-quoting prevents single-quote escaping problems
- Migration overwrites existing placeholder templates
- No structural changes to tables (pure data UPDATE)


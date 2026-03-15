

## PG_CRON Garbage Collector — Implementation Plan

### Finding
Queried `information_schema.referential_constraints` — **zero foreign keys** reference `assigned_workouts`. The `workout_logs.assigned_workout_id` column is a soft reference (no constraint). Deleting old assignments is completely safe for workout history.

### Step 1: Migration — Enable pg_cron Extension

Create `supabase/migrations/..._enable_pg_cron.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
```

This ensures the extension is available. Supabase hosted projects typically have `pg_cron` pre-installed but gated behind `CREATE EXTENSION`.

### Step 2: SQL Editor Command (Manual)

Output the exact snippet for the coach to paste into Supabase SQL Editor → New Query:

```sql
SELECT cron.schedule(
  'weekly-assigned-workouts-cleanup',
  '59 23 * * 0',
  $$DELETE FROM public.assigned_workouts WHERE scheduled_date < CURRENT_DATE$$
);
```

This runs every Sunday 23:59 UTC, deleting rows where `scheduled_date` is strictly before today. Today's assignments are preserved.

### Why Not a Migration for the Schedule?
`cron.schedule` is a runtime DML operation (inserts into `cron.job`), not a schema change. Supabase migrations run with limited privileges and `pg_cron` scheduling can fail in migration context. The SQL Editor runs as `postgres` role with full privileges.

### Safety Summary
- No FK cascade risk (confirmed via schema query)
- `workout_logs` untouched — soft reference only
- Today's workouts excluded (`< CURRENT_DATE`, not `<=`)
- Idempotent job name — re-running updates rather than duplicates

### Files
| Action | Target |
|--------|--------|
| Migration | Enable `pg_cron` extension |
| Chat output | SQL Editor snippet for coach to execute manually |


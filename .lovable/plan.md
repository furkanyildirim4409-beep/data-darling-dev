# AI Doctor Distributed Multi-Agent Pipeline (Part 1/3)

## Critical schema correction

Your spec references `athlete_blood_tests`. The actual table in this project is **`public.blood_tests`** (confirmed; used today by `supabase/functions/ai-doctor/index.ts`). All migrations and edge code in this plan target `blood_tests`. Confirm before I run the migration if you intended a separate table.

Current scale check: only **5 active assigned athletes** exist today, so the 2,000-per-agent cap will produce a single worker batch in practice — the partitioning logic is still built to scale.

---

## 1. Database migration

Single migration, all in one transaction:

**A. `public.blood_tests` columns**
- `last_analyzed_at timestamptz NULL`
- `is_stale_for_ai boolean NOT NULL DEFAULT false`
- Index `idx_blood_tests_user_analyzed (user_id, last_analyzed_at DESC)`

**B. `public.ai_radar_agent_queue`**
```
id uuid pk default gen_random_uuid()
batch_id integer not null
athlete_id uuid not null references profiles(id) on delete cascade
coach_id uuid not null
agent_assigned_id text not null         -- e.g. "agent_alpha_3"
processing_status text not null default 'queued'
                                        -- queued|processing|completed|failed
locked_at timestamptz
completed_at timestamptz
error_message text
run_started_at timestamptz not null default now()
created_at timestamptz not null default now()
UNIQUE(athlete_id, run_started_at)      -- one slot per athlete per weekly run
```
Plus indexes on `(processing_status, agent_assigned_id)` and `(run_started_at)`.

Grants: `service_role` ALL; `authenticated` SELECT only. RLS ON; policies: head coach + active team members can SELECT rows where `coach_id` matches their scope (reuse `is_active_team_member_of`). No client INSERT/UPDATE — only edge functions via service role.

**C. Atomic lock RPC** `public.claim_radar_queue_batch(_agent_id text, _limit int)`:
- `SECURITY DEFINER`, atomic `UPDATE … SET processing_status='processing', agent_assigned_id=_agent_id, locked_at=now() WHERE id IN (SELECT id FROM ai_radar_agent_queue WHERE processing_status='queued' ORDER BY batch_id, id FOR UPDATE SKIP LOCKED LIMIT _limit) RETURNING *`.
- Guarantees no two workers ever pick the same athlete.

---

## 2. Edge functions

**`supabase/functions/radar-dispatcher/index.ts`** (orchestrator, `verify_jwt=false`, invoked by cron)
1. Count active athletes: `profiles WHERE role='athlete' AND coach_id IS NOT NULL`.
2. Partition into chunks of 2000, assign sequential `agent_assigned_id` = `agent_alpha_{n}` and `batch_id` = n.
3. Bulk-insert one queue row per athlete (chunked 500 to respect Supabase insert limits — per project memory).
4. Fan out by invoking `radar-worker` once per agent token (fire-and-forget `fetch` with `Authorization: service_role`).

**`supabase/functions/radar-worker/index.ts`** (one instance per `agent_assigned_id`)
Loop until no rows returned:
1. Call `claim_radar_queue_batch(agent_id, 25)` → atomic claim of up to 25 rows.
2. For each athlete, build the 7-day snapshot exactly like existing `ai-doctor` (`daily_checkins`, `nutrition_logs`, `workout_logs`, `weight_logs`, `ai_weekly_analyses` history).
3. **Bloodwork context flag (§3 of spec):**
   - Fetch latest `blood_tests` row by `user_id` (order `date desc limit 1`).
   - **Case A (Stale):** `last_analyzed_at IS NOT NULL` AND no newer row created since → prepend system header:
     `"⚠️ CRITICAL SYSTEM NOTE: Bu kan tahlili daha önceki haftalık taramada zaten analiz edilmiştir. Mevcut veri seti güncel/yeni yüklenmiş bir test değildir, sadece geçmiş referans tabanıdır."`
     Include test in context but tag `bloodwork_is_stale: true`.
   - **Case B (Fresh):** `last_analyzed_at IS NULL` OR newer than the previous run timestamp → high-weight injection, then `UPDATE blood_tests SET last_analyzed_at = now(), is_stale_for_ai = true WHERE id = <id>`.
4. Call Gemini 2.5 Flash via Lovable AI Gateway with the same `analyze_athlete` tool schema already used in `ai-doctor`.
5. Auto-resolve prior `ai_weekly_analyses` rows for that athlete (`resolved=true`), insert new insights (mirrors existing logic).
6. Mark queue row `processing_status='completed', completed_at=now()`. On error → `failed` + `error_message`, do NOT throw (so other rows continue).

Both functions registered in `supabase/config.toml` with `verify_jwt = false`.

---

## 3. Cron schedule (Istanbul GMT+3 = UTC+3)

Window: **Sunday 00:00 → Monday 06:00 Istanbul** = Sat 21:00 UTC → Mon 03:00 UTC.

Two `pg_cron` jobs (created via the **insert tool**, not migration, because they embed the project URL + anon key — per project rules):

1. `ai-radar-kickoff` — `0 21 * * 6` (Saturday 21:00 UTC = Sunday 00:00 Istanbul) → POSTs to `radar-dispatcher`. Single kickoff.
2. `ai-radar-sweep` — `*/30 21-23 * * 6` + `*/30 * * * 0` + `0,30 0-3 * * 1` → POSTs to `radar-dispatcher` with `{mode:'resume'}` so any `queued`/`failed` rows from earlier batches are retried until the Monday 06:00 Istanbul cutoff. Dispatcher in resume mode skips re-enqueue and just re-fans-out workers if queued rows remain.

`pg_cron` + `pg_net` extensions confirmed enabled (already used by other triggers in this project).

---

## 4. Files to create/modify

- `supabase/migrations/<ts>_ai_radar_queue.sql` (schema + RPC + RLS + grants)
- `supabase/functions/radar-dispatcher/index.ts` (new)
- `supabase/functions/radar-worker/index.ts` (new)
- `supabase/config.toml` (register two functions with `verify_jwt = false`)
- Cron jobs inserted via `supabase--read_query`-style insert (post-migration, requires user approval).
- `src/integrations/supabase/types.ts` auto-regenerates after migration.

No frontend changes in this part (parts 2/3 will handle UI surfacing).

---

## Open questions before I build

1. Confirm target table is **`public.blood_tests`** (not `athlete_blood_tests`).
2. Confirm Istanbul cutoff = **Monday 06:00 local** (= 03:00 UTC Monday).
3. OK to register both new edge functions with `verify_jwt = false` and authenticate the cron POST via a shared service-role bearer in the SQL?

# AI Doctor: Model Upgrade + Rejection Memory Loop

## A. Model upgrade (`supabase/functions/ai-doctor/index.ts`)

Swap `google/gemini-2.5-flash` for `google/gemini-3-flash-preview` (the latest reasoning-grade Flash on the Lovable AI Gateway — `gemini-2.0-flash-thinking-exp` is not exposed by the Gateway, so we use the supported equivalent). Keep the existing tool-calling schema (Gemini constrained-decoding limits), and add a tight `temperature: 0.4` to nudge stricter clinical output. Do not add unsupported sampling params.

## B. Rejection memory loop

Before the LLM call, fetch the coach's rejection history for this athlete from `coach_action_ledger` (last 14 days) using the already-initialised `adminClient`:

```ts
const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
const { data: ledgerRows } = await adminClient
  .from("coach_action_ledger")
  .select("issue_title, issue_details, status, created_at")
  .eq("coach_id", coachId)
  .eq("athlete_id", athleteId)
  .gte("created_at", fourteenDaysAgo)
  .order("created_at", { ascending: false })
  .limit(50);
```

Build a deduplicated string list of rejected/ignored signals:
- Any row where `status === "ignored"` → push `issue_title`.
- For every row, parse `issue_details.dismissed_actions` (array of strings) and push each entry.
- `Array.from(new Set(...))`, truncate to ~25 items.

If the list is non-empty, append a dynamically constructed system message AFTER the existing `systemPrompt`:

```
CRITICAL CONTEXT: The coach previously MANUALLY REJECTED or IGNORED the following recommendations for this athlete in the past 14 days:
- <item 1>
- <item 2>
...
DO NOT recommend these exact same actions again this week unless biometric data indicates a critical, life-threatening deviation. Adapt your strategy based on the coach's past rejections.
```

Inject it as an additional `{ role: "system", content: rejectionContext }` message placed between the existing system prompt and the user message (so the base persona stays first, the memory layer comes second, then the data payload). When the list is empty, skip injection entirely — no empty headers.

## C. Safety / compatibility

- Wrap the ledger fetch in a try/catch-style guard (check `error`, log, then proceed without the memory layer) so an empty/missing `coach_action_ledger` table never breaks analysis.
- Keep all other logic (auth, snapshot aggregation, auto-resolve, insert) unchanged.
- No DB migrations, no client changes, no schema changes to `ai_weekly_analyses`.

## Out of scope

- `generate-ai-program` and other functions (only `ai-doctor` produces `aiInterventions`).
- UI changes in `Alerts.tsx` / `ActionLedgerDesk.tsx`.
- New tables, columns, or RLS edits.

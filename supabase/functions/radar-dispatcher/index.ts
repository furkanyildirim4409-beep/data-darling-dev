// AI Doctor Radar — Dispatcher
// Partitions all active athletes into agent batches (max 2,000 per agent),
// enqueues them in ai_radar_agent_queue, then fans out to radar-worker.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AGENTS_BATCH_SIZE = 2000;
const INSERT_CHUNK = 500;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // SECURITY: Prevent unauthenticated AI-credit / DB-load drain attacks.
    // Allow only callers presenting CRON_SECRET (pg_cron) or the service-role
    // bearer (internal/server invocations).
    const cronSecret = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("authorization") || "";
    const cronHeader = req.headers.get("x-cron-secret") || "";
    if (authHeader !== `Bearer ${serviceRoleKey}` && !(cronSecret && cronHeader === cronSecret)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);


    let mode: "kickoff" | "resume" = "kickoff";
    try {
      const body = await req.json();
      if (body?.mode === "resume") mode = "resume";
    } catch (_) { /* no body */ }

    const runStartedAt = new Date().toISOString();
    let enqueued = 0;
    let agentTokens: string[] = [];

    if (mode === "kickoff") {
      // 1. Fetch all active athletes (paginate to dodge the 1000-row default)
      const athletes: { id: string; coach_id: string }[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await admin
          .from("profiles")
          .select("id, coach_id")
          .eq("role", "athlete")
          .not("coach_id", "is", null)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        athletes.push(...(data as any));
        if (data.length < PAGE) break;
        from += PAGE;
      }

      if (athletes.length === 0) {
        return new Response(JSON.stringify({ ok: true, mode, enqueued: 0, agents: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Partition into agent batches of 2000
      const rows: Record<string, unknown>[] = [];
      for (let i = 0; i < athletes.length; i++) {
        const batchId = Math.floor(i / AGENTS_BATCH_SIZE) + 1;
        const agentId = `agent_alpha_${batchId}`;
        rows.push({
          batch_id: batchId,
          athlete_id: athletes[i].id,
          coach_id: athletes[i].coach_id,
          agent_assigned_id: agentId,
          processing_status: "queued",
          run_started_at: runStartedAt,
        });
      }
      const tokenSet = new Set(rows.map((r) => r.agent_assigned_id as string));
      agentTokens = Array.from(tokenSet);

      // 3. Chunked insert (500 per batch)
      for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
        const slice = rows.slice(i, i + INSERT_CHUNK);
        const { error } = await admin
          .from("ai_radar_agent_queue")
          .insert(slice);
        if (error) {
          // Unique violation = athlete already enqueued for this run, ignore
          if (!String(error.message || "").toLowerCase().includes("duplicate")) {
            console.error("[dispatcher] insert error:", error);
          }
        } else {
          enqueued += slice.length;
        }
      }
    } else {
      // Resume mode — re-fan-out workers for whatever is still queued
      const { data, error } = await admin
        .from("ai_radar_agent_queue")
        .select("agent_assigned_id")
        .eq("processing_status", "queued");
      if (error) throw error;
      agentTokens = Array.from(new Set((data || []).map((r: any) => r.agent_assigned_id)));
    }

    // 4. Fan out workers (fire-and-forget)
    const workerUrl = `${supabaseUrl}/functions/v1/radar-worker`;
    for (const token of agentTokens) {
      fetch(workerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ agent_assigned_id: token }),
      }).catch((e) => console.error("[dispatcher] worker fanout failed:", token, e));
    }

    console.log(`[dispatcher] mode=${mode} enqueued=${enqueued} agents=${agentTokens.length}`);

    return new Response(
      JSON.stringify({ ok: true, mode, enqueued, agents: agentTokens }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[dispatcher] fatal:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// AI Doctor Radar — Worker (one instance per agent_assigned_id token)
// Atomically claims rows from ai_radar_agent_queue, builds the 7-day snapshot,
// applies bloodwork staleness flag logic, calls Gemini Flash, and inserts insights.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLAIM_BATCH = 25;
const MAX_LOOPS = 200; // safety cap

const STALE_BLOODWORK_FLAG =
  "⚠️ CRITICAL SYSTEM NOTE: Bu kan tahlili daha önceki haftalık taramada zaten analiz edilmiştir. Mevcut veri seti güncel/yeni yüklenmiş bir test değildir, sadece geçmiş referans tabanıdır.";

const SYSTEM_PROMPT_BASE = `Sen elit bir Spor Hekimi ve Olimpiyat seviyesinde bir Fitness Koçusun. Aşağıdaki sporcu verilerini (uyku, stres, kas ağrısı, beslenme, antrenman, kilo değişimi, kan tahlili) incele.

KRİTİK GÖREVİN:
- Veriler arasındaki SEBEP-SONUÇ ilişkilerini (korelasyonları) bul.
- Sadece anlamlı anormallikleri ve bağlantıları raporla.
- Yanıtın Türkçe olmalı.

ZAMAN ÇİZELGESİ VE TREND ANALİZİ:
- Her zaman EN GÜNCEL verilere (son 2-3 gün) en yüksek önceliği ver.
- Geçen haftaki kötü veriler düzelmişse "low" (Pozitif) severity ile raporla.

GEÇMİŞ BAĞLAM:
- 'patientHistory' önceki AI analizlerini ve uygulanan aksiyonları içerir; tekrarlayan/çözülmüş sorunları buna göre değerlendir.

ÖNEMLİ KURAL: Minimum 3, maksimum 10 insight üret. Her sorun için 1-3 aksiyon.

AKSİYON ÜRETİMİ (ZORUNLU):
- action.type: "supplement" | "program" | "message" | "nutrition"
- is_quantitative: matematiksel yüzde değişimi içeren eylem ise true, yoksa false.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { agent_assigned_id } = await req.json();
    if (!agent_assigned_id) {
      return new Response(JSON.stringify({ error: "agent_assigned_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let failed = 0;

    for (let loop = 0; loop < MAX_LOOPS; loop++) {
      const { data: claimed, error: claimErr } = await admin.rpc(
        "claim_radar_queue_batch",
        { _agent_id: agent_assigned_id, _limit: CLAIM_BATCH },
      );
      if (claimErr) {
        console.error("[worker] claim error:", claimErr);
        break;
      }
      if (!claimed || claimed.length === 0) break;

      for (const row of claimed as any[]) {
        try {
          await processAthlete(admin, LOVABLE_API_KEY, row);
          await admin
            .from("ai_radar_agent_queue")
            .update({ processing_status: "completed", completed_at: new Date().toISOString() })
            .eq("id", row.id);
          processed++;
        } catch (e: any) {
          console.error("[worker] athlete failed:", row.athlete_id, e?.message);
          await admin
            .from("ai_radar_agent_queue")
            .update({
              processing_status: "failed",
              completed_at: new Date().toISOString(),
              error_message: String(e?.message || e).slice(0, 1000),
            })
            .eq("id", row.id);
          failed++;
        }
      }
    }

    console.log(`[worker:${agent_assigned_id}] processed=${processed} failed=${failed}`);
    return new Response(
      JSON.stringify({ ok: true, agent_assigned_id, processed, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[worker] fatal:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function processAthlete(admin: any, apiKey: string, row: any) {
  const athleteId = row.athlete_id;
  const coachId = row.coach_id;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: profile } = await admin
    .from("profiles").select("id, full_name").eq("id", athleteId).maybeSingle();
  const athleteName = profile?.full_name || "İsimsiz";

  const [checkinsRes, nutritionRes, workoutsRes, weightRes, bloodRes, historyRes] = await Promise.all([
    admin.from("daily_checkins")
      .select("mood, sleep, stress, soreness, digestion, created_at")
      .eq("user_id", athleteId).gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false }),
    admin.from("nutrition_logs")
      .select("meal_name, total_calories, total_protein, total_carbs, total_fat, logged_at")
      .eq("user_id", athleteId).gte("logged_at", sevenDaysAgo)
      .order("logged_at", { ascending: false }),
    admin.from("workout_logs")
      .select("workout_name, tonnage, duration_minutes, completed, logged_at")
      .eq("user_id", athleteId).gte("logged_at", sevenDaysAgo)
      .order("logged_at", { ascending: false }),
    admin.from("weight_logs")
      .select("weight_kg, logged_at")
      .eq("user_id", athleteId)
      .order("logged_at", { ascending: false }).limit(5),
    admin.from("blood_tests")
      .select("id, extracted_data, date, status, created_at, last_analyzed_at, is_stale_for_ai")
      .eq("user_id", athleteId)
      .order("date", { ascending: false }).limit(1),
    admin.from("ai_weekly_analyses")
      .select("severity, title, analysis, actions, created_at")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false }).limit(20),
  ]);

  // Bloodwork staleness logic
  const latestBlood = bloodRes.data?.[0] || null;
  let bloodworkIsStale = false;
  let bloodworkSystemHeader = "";
  if (latestBlood) {
    const createdAt = latestBlood.created_at ? new Date(latestBlood.created_at).getTime() : 0;
    const analyzedAt = latestBlood.last_analyzed_at ? new Date(latestBlood.last_analyzed_at).getTime() : 0;
    if (analyzedAt && createdAt <= analyzedAt) {
      // Case A — stale
      bloodworkIsStale = true;
      bloodworkSystemHeader = STALE_BLOODWORK_FLAG;
    } else {
      // Case B — fresh; mark analyzed now
      await admin
        .from("blood_tests")
        .update({ last_analyzed_at: new Date().toISOString(), is_stale_for_ai: true })
        .eq("id", latestBlood.id);
    }
  }

  const snapshot = {
    athleteName,
    checkins: checkinsRes.data || [],
    nutrition: nutritionRes.data || [],
    workouts: workoutsRes.data || [],
    recentWeights: weightRes.data || [],
    latestBloodTest: latestBlood,
    bloodwork_is_stale: bloodworkIsStale,
    patientHistory: historyRes.data || [],
  };

  const systemPrompt = bloodworkSystemHeader
    ? `${bloodworkSystemHeader}\n\n${SYSTEM_PROMPT_BASE}`
    : SYSTEM_PROMPT_BASE;

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${athleteName} adlı sporcunun son 7 günlük verileri:\n${JSON.stringify(snapshot, null, 2)}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "analyze_athlete",
          description: "Sporcu analiz sonuçlarını döndür.",
          parameters: {
            type: "object",
            properties: {
              insights: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    severity: { type: "string", enum: ["high", "medium", "low"] },
                    title: { type: "string" },
                    analysis: { type: "string" },
                    actions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: { type: "string", enum: ["supplement", "program", "message", "nutrition"] },
                          label: { type: "string" },
                          payload: { type: "string" },
                          is_quantitative: { type: "boolean" },
                        },
                        required: ["type", "label", "payload", "is_quantitative"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["severity", "title", "analysis", "actions"],
                  additionalProperties: false,
                },
              },
            },
            required: ["insights"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "analyze_athlete" } },
    }),
  });

  if (!aiResponse.ok) {
    const t = await aiResponse.text();
    throw new Error(`AI Gateway ${aiResponse.status}: ${t.slice(0, 200)}`);
  }

  const aiResult = await aiResponse.json();
  const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("AI returned no tool call");
  const parsed = JSON.parse(toolCall.function.arguments);
  const insights = parsed.insights || [];

  // Auto-resolve previous unresolved analyses for this athlete
  await admin
    .from("ai_weekly_analyses")
    .update({ resolved: true })
    .eq("athlete_id", athleteId)
    .eq("coach_id", coachId)
    .eq("resolved", false);

  if (insights.length > 0) {
    const rows = insights.map((i: any) => ({
      athlete_id: athleteId,
      coach_id: coachId,
      severity: i.severity || "low",
      title: String(i.title).slice(0, 200),
      analysis: String(i.analysis).slice(0, 4000),
      athlete_name: athleteName,
      actions: Array.isArray(i.actions)
        ? i.actions.map((a: any) => ({ ...a, is_quantitative: a.is_quantitative ?? false }))
        : [],
    }));
    await admin.from("ai_weekly_analyses").insert(rows);
  }
}

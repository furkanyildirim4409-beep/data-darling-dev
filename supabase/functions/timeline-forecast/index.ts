import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const { athleteId } = await req.json();
    if (!athleteId || typeof athleteId !== "string") {
      return json(400, { error: "athleteId is required" });
    }
    if (!LOVABLE_API_KEY) return json(500, { error: "LOVABLE_API_KEY not configured" });

    const supa = createClient(SUPABASE_URL, SERVICE_KEY);
    const since = new Date();
    since.setDate(since.getDate() - 28);
    const sinceIso = since.toISOString();

    const [bm, wl, nl, nt, dc, sup] = await Promise.all([
      supa
        .from("body_measurements")
        .select("logged_at, body_fat_pct, muscle_mass_kg, waist, chest")
        .eq("user_id", athleteId)
        .gte("logged_at", sinceIso)
        .order("logged_at", { ascending: true }),
      supa
        .from("workout_logs")
        .select("logged_at, tonnage, duration_minutes")
        .eq("user_id", athleteId)
        .gte("logged_at", sinceIso)
        .order("logged_at", { ascending: true }),
      supa
        .from("nutrition_logs")
        .select("logged_at, total_calories, total_protein, total_carbs, total_fat")
        .eq("user_id", athleteId)
        .gte("logged_at", sinceIso),
      supa
        .from("nutrition_targets")
        .select("daily_calories, protein_g, carbs_g, fat_g")
        .eq("athlete_id", athleteId)
        .maybeSingle(),
      supa
        .from("daily_checkins")
        .select("created_at, mood, sleep_hours, stress, soreness, digestion")
        .eq("user_id", athleteId)
        .gte("created_at", sinceIso),
      supa
        .from("athlete_supplements")
        .select("name_and_dosage, total_servings, servings_per_use")
        .eq("athlete_id", athleteId),
    ]);

    const measurements = bm.data ?? [];
    const workouts = wl.data ?? [];
    const meals = nl.data ?? [];
    const target = nt.data ?? null;
    const checkins = dc.data ?? [];
    const supplements = sup.data ?? [];

    // Aggregations
    const avgCalories =
      meals.length > 0
        ? Math.round(meals.reduce((s: number, m: any) => s + (m.total_calories ?? 0), 0) / meals.length)
        : 0;
    const totalTonnage = workouts.reduce((s: number, w: any) => s + Number(w.tonnage ?? 0), 0);
    const sessionsCount = workouts.length;
    const compliance =
      target?.daily_calories
        ? Math.round(
            (meals.filter((m: any) => {
              const r = (m.total_calories ?? 0) / target.daily_calories;
              return r >= 0.85 && r <= 1.15;
            }).length /
              Math.max(meals.length, 1)) *
              100
          )
        : null;

    const ctx = {
      window_days: 28,
      measurements_first: measurements[0] ?? null,
      measurements_last: measurements[measurements.length - 1] ?? null,
      measurements_count: measurements.length,
      workouts_count: sessionsCount,
      total_tonnage_kg: Math.round(totalTonnage),
      avg_session_tonnage_kg: sessionsCount ? Math.round(totalTonnage / sessionsCount) : 0,
      avg_session_duration_min:
        sessionsCount
          ? Math.round(
              workouts.reduce((s: number, w: any) => s + Number(w.duration_minutes ?? 0), 0) /
                sessionsCount
            )
          : 0,
      meal_logs_count: meals.length,
      avg_daily_calories: avgCalories,
      nutrition_target: target,
      calorie_compliance_pct: compliance,
      checkins_count: checkins.length,
      supplements_count: supplements.length,
    };

    const systemPrompt = `Sen elit bir spor bilimi tahmin motorusun. Sporcunun son 4 haftalık verisinden 4 haftalık ileriye dönük performans projeksiyonu üret.

Türkçe markdown ile yanıt ver. ZORUNLU bölüm başlıkları:
### 📊 Mevcut Durum Özeti
### 🎯 Korelasyon Analizi
### 🔮 Gelecek Dönem Gelişim & Hipertrofi Tahmini

Son bölümde mutlaka 4 haftalık ileriye dönük tahmin tablosu olsun: kilo, yağ %, kas kütlesi, tonaj, beslenme uyumu, disiplin skoru. Sayısal değerleri tek ondalık basamağa yuvarla.`;

    const userPrompt = `Sporcu verisi (JSON):\n${JSON.stringify(ctx, null, 2)}\n\nYukarıdaki verilere dayanarak holistik tahmin raporu üret.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (aiResp.status === 429) return json(429, { error: "AI gateway rate limit. Lütfen daha sonra tekrar deneyin." });
    if (aiResp.status === 402) return json(402, { error: "AI gateway kredisi bitti. Workspace bakiyenizi yenileyin." });
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return json(500, { error: "AI gateway error" });
    }

    const payload = await aiResp.json();
    const markdown = payload?.choices?.[0]?.message?.content ?? "";
    return json(200, { markdown, context: ctx });
  } catch (e) {
    console.error("timeline-forecast error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});

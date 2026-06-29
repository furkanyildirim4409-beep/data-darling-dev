import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require an authenticated caller to prevent unauthenticated credit drain / prompt-injection abuse
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // RBAC: only coaches/admins may invoke the AI generator (prevents LLM credit abuse)
    const callerId = (claimsData.claims as any).sub as string | undefined;
    if (!callerId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roleRows, error: roleErr } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    if (roleErr) {
      return new Response(
        JSON.stringify({ error: "Role check failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const roles = new Set((roleRows ?? []).map((r: any) => r.role));
    if (!roles.has("coach") && !roles.has("admin") && !roles.has("super_admin")) {
      return new Response(
        JSON.stringify({ error: "Forbidden: coach role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit: max 10 generations / hour and 30 / day per caller (prevents LLM credit drain).
    const isAdmin = roles.has("admin") || roles.has("super_admin");
    if (!isAdmin) {
      const now = new Date();
      const hourWindow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours())).toISOString();
      const dayWindow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

      const [{ data: hourCount }, { data: dayCount }] = await Promise.all([
        adminClient.rpc("bump_edge_rate_limit", { _user_id: callerId, _bucket: "ai_program_hour", _window: hourWindow }),
        adminClient.rpc("bump_edge_rate_limit", { _user_id: callerId, _bucket: "ai_program_day", _window: dayWindow }),
      ]);

      if ((hourCount ?? 0) > 10 || (dayCount ?? 0) > 30) {
        const retryAfter = (hourCount ?? 0) > 10 ? 3600 : 86400;
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. AI program oluşturma limiti aşıldı.", retryAfter }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retryAfter) } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let goal = "Hipertrofi";
    let days = 3;
    let level = "Orta";
    let specialNotes = "";
    let validExercises: Array<{ name: string; target_muscle?: string }> = [];
    try {
      const body = await req.json();
      if (body.goal) goal = body.goal;
      if (body.days) days = Math.min(Math.max(Number(body.days), 1), 7);
      if (body.level) level = body.level;
      if (body.specialNotes) specialNotes = String(body.specialNotes).slice(0, 500);
      if (Array.isArray(body.validExercises)) {
        validExercises = body.validExercises.map((e: any) =>
          typeof e === "string"
            ? { name: e }
            : { name: String(e.name ?? ""), target_muscle: e.target_muscle ? String(e.target_muscle) : undefined }
        ).filter((e: { name: string }) => e.name.length > 0);
      }
    } catch { /* empty body ok */ }

    // Truncate to ~1200 entries for token safety
    const exerciseList = validExercises.slice(0, 1200);

    const exerciseDirective = exerciseList.length > 0
      ? `\n\n=== MUTLAK KURAL — EGZERSİZ SÖZLÜĞÜ ===\nAşağıda projeye ait DOĞRULANMIŞ egzersiz kütüphanesi var (format: "İsim [hedef kas]"). Senin görevin SADECE bu listedeki egzersizleri kullanmak.\n\nYASAKLAR (HİÇBİR İSTİSNA YOK):\n- Listede olmayan bir egzersiz adı üretmek YASAK.\n- İsmi çevirmek, kısaltmak, yeniden formatlamak, varyant adı uydurmak YASAK.\n- Liste dışındaki sinonim/benzer egzersizleri kullanmak YASAK.\n- Emin değilsen listeden en yakın anlamsal eşleşmeyi BİREBİR kopyala; asla yeni isim uydurma.\n\nKURAL: Her üretilen egzersiz adı, aşağıdaki listedeki bir girdiyle KARAKTER KARAKTER aynı olmalıdır.\n\nEgzersiz sözlüğü:\n${exerciseList.map((e) => e.target_muscle ? `${e.name} [${e.target_muscle}]` : e.name).join("\n")}`
      : '';

    const levelDirective = `\nSporcu Seviyesi: ${level}.`;
    const notesDirective = specialNotes ? `\nÖzel Notlar/Sakatlıklar: ${specialNotes}. Bu özel durumlara KESİNLİKLE DİKKAT EDEREK ve notlara uygun şekilde programı optimize et.` : '';


    const systemPrompt = `Sen elit bir güç ve kondisyon koçusun. Senden ${days} günlük bir antrenman programı üretmeni istiyorum. Hedef: ${goal}.${levelDirective}${notesDirective} Her gün için gün adı ve egzersiz listesi oluştur. Her egzersiz için set sayısı, tekrar aralığı ve notlar ekle. Notlar kısa ve teknik olsun (ör. "Tükenişe 2 tekrar kala bırak", "Kontrollü negatif").${exerciseDirective}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${days} günlük ${goal} odaklı antrenman programı oluştur.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_program",
              description: "Yapılandırılmış antrenman programı döndür.",
              parameters: {
                type: "object",
                properties: {
                  program: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        dayName: { type: "string", description: "Gün adı, ör: '1. Gün: İtme (Push)'" },
                        exercises: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string", description: "Egzersiz adı — verilen sözlükteki bir girdiyle BİREBİR (karakter karakter, büyük/küçük harf dahil) aynı olmak ZORUNDA. Yeni isim uydurma." },
                              sets: { type: "number" },
                              reps: { type: "string", description: "Tekrar aralığı, ör: '8-10'" },
                              notes: { type: "string", description: "Kısa teknik not" },
                            },
                            required: ["name", "sets", "reps", "notes"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["dayName", "exercises"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["program"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_program" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit aşıldı, lütfen biraz bekleyin." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Kredi yetersiz, lütfen Lovable hesabınıza kredi ekleyin." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI Gateway error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: `AI gateway hatası (${response.status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: "AI yanıtı beklenen formatta değil." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    console.log(`[generate-ai-program] Generated ${parsed.program?.length || 0} days`);

    return new Response(JSON.stringify(parsed.program), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-ai-program error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Bilinmeyen hata" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

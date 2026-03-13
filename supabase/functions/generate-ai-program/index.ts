import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    let validExercises: string[] = [];
    try {
      const body = await req.json();
      if (body.goal) goal = body.goal;
      if (body.days) days = Math.min(Math.max(Number(body.days), 1), 7);
      if (body.level) level = body.level;
      if (body.specialNotes) specialNotes = String(body.specialNotes).slice(0, 500);
      if (Array.isArray(body.validExercises)) validExercises = body.validExercises;
    } catch { /* empty body ok */ }

    // Truncate to ~1200 entries for token safety
    const exerciseList = validExercises.slice(0, 1200);

    const exerciseDirective = exerciseList.length > 0
      ? `\n\nKRİTİK KURAL: SADECE aşağıdaki listeden egzersiz seç. Listedeki isimleri BİREBİR kullan — değiştirme, çevirme, kısaltma veya yeni isim uydurma. Listede olmayan hiçbir egzersiz kullanma.\n\nGeçerli egzersiz listesi:\n${exerciseList.join(', ')}`
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
                              name: { type: "string", description: "Egzersiz adı Türkçe" },
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

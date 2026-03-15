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
    // ── 1. AUTH ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Yetkisiz erişim." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Geçersiz oturum." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const coachId = claimsData.claims.sub as string;

    // ── 2. Parse request ──
    const { athleteId } = await req.json();
    if (!athleteId || typeof athleteId !== "string") {
      return new Response(
        JSON.stringify({ error: "athleteId gerekli." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. AUTHORIZATION ──
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: athleteProfile } = await adminClient
      .from("profiles")
      .select("id, full_name, coach_id")
      .eq("id", athleteId)
      .maybeSingle();

    if (!athleteProfile || athleteProfile.coach_id !== coachId) {
      return new Response(
        JSON.stringify({ error: "Bu sporcuya erişim yetkiniz yok." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const athleteName = athleteProfile.full_name || "İsimsiz";

    // ── 4. Aggregate 7-day holistic data ──
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [checkinsRes, nutritionRes, workoutsRes, weightRes, bloodRes, historyRes] = await Promise.all([
      adminClient.from("daily_checkins")
        .select("mood, sleep, stress, soreness, digestion, created_at")
        .eq("user_id", athleteId)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false }),
      adminClient.from("nutrition_logs")
        .select("meal_name, total_calories, total_protein, total_carbs, total_fat, logged_at")
        .eq("user_id", athleteId)
        .gte("logged_at", sevenDaysAgo)
        .order("logged_at", { ascending: false }),
      adminClient.from("workout_logs")
        .select("workout_name, tonnage, duration_minutes, completed, logged_at")
        .eq("user_id", athleteId)
        .gte("logged_at", sevenDaysAgo)
        .order("logged_at", { ascending: false }),
      adminClient.from("weight_logs")
        .select("weight_kg, logged_at")
        .eq("user_id", athleteId)
        .order("logged_at", { ascending: false })
        .limit(5),
      adminClient.from("blood_tests")
        .select("extracted_data, date, status")
        .eq("user_id", athleteId)
        .order("date", { ascending: false })
        .limit(1),
      adminClient.from("ai_weekly_analyses")
        .select("severity, title, analysis, actions, created_at")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const snapshot = {
      athleteName,
      checkins: checkinsRes.data || [],
      nutrition: nutritionRes.data || [],
      workouts: workoutsRes.data || [],
      recentWeights: weightRes.data || [],
      latestBloodTest: bloodRes.data?.[0] || null,
      patientHistory: historyRes.data || [],
    };

    // ── 5. Call Gemini Flash via Lovable AI Gateway ──
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY yapılandırılmamış." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Sen elit bir Spor Hekimi ve Olimpiyat seviyesinde bir Fitness Koçusun. Aşağıdaki sporcu verilerini (uyku, stres, kas ağrısı, beslenme, antrenman, kilo değişimi, kan tahlili) incele.

KRİTİK GÖREVİN:
- Veriler arasındaki SEBEP-SONUÇ ilişkilerini (korelasyonları) bul
- Sadece anlamlı anormallikleri ve bağlantıları raporla
- Örnek: "3 gündür uyku skoru 3/10 altında ve protein alımı hedefin %60'ında. Bu kombinasyon, antrenman tonajındaki %30 düşüşü açıklıyor."
- Veri yoksa veya yeterliyse, severity "low" ile pozitif bir yorum yap
- Yanıtın Türkçe olmalı

GEÇMİŞ BAĞLAM (CRITICAL):
Sana 'patientHistory' adında sporcunun önceki yapay zeka analizleri ve koçun uyguladığı aksiyonlar (completed: true olanlar) veriliyor. Yeni verileri incelerken ASLA sadece bugüne bakma. Geçmişle kıyasla!
- Eğer geçmişte bir aksiyon uygulanmışsa (completed: true), sonuçlarını değerlendir: "Geçen hafta D vitamini verilmiş ve CRP düşmüş, tedavi işe yaramış."
- Eğer geçmişte bir aksiyon ÖNERİLMİŞ ama uygulanmamışsa (completed: false/undefined), bunu belirt: "Geçen hafta önerilen protein artışı uygulanmamış, sorun devam ediyor."
- Aynı sorunu tekrar raporluyorsan, bunun TEKRARLAYAN bir sorun olduğunu vurgula ve daha agresif bir aksiyon öner.
- Geçmişteki eylemlerin işe yarayıp yaramadığını analiz metninde MUTLAKA belirt.

ÖNEMLİ KURAL: Bulduğun TÜM anormallikleri raporla. Kendini 1 veya 2 analizle ASLA sınırlandırma. Eğer sporcunun verilerinde 5 farklı sorun (veya pozitif durum) varsa, insights dizisine 5 farklı obje ekle. Minimum 3, maksimum 10 insight üret. Her sorun için en az 1, en fazla 3 spesifik aksiyon üret.

AKSİYON ÜRETİMİ (ZORUNLU):
- Her teşhis için somut, uygulanabilir AKSİYON butonları üret.
- action.type SADECE şu 4 değerden biri olmalı: "supplement", "program", "message", "nutrition". Başka değer KULLANMA.
- action.label: Buton metni olacak, kısa ve net (Örn: "D Vitamini Başlat", "Hacmi %20 Düşür", "Protein Hedefini Artır").
- action.payload: Sporcuya gönderilecek bildirim cümlesi (Örn: "Günlük 2000 IU D Vitamini takviyesi sisteme eklendi.", "Antrenman hacminiz bu hafta %20 azaltıldı.").
- low severity bulgular için de en az 1 pozitif aksiyon üret (Örn: type:"message", label:"Tebrik Mesajı Gönder", payload:"Harika gidiyorsun! Bu haftaki uyumluluğun mükemmel.").`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `${athleteName} adlı sporcunun son 7 günlük verileri:\n${JSON.stringify(snapshot, null, 2)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_athlete",
              description: "Sporcu analiz sonuçlarını yapılandırılmış olarak döndür.",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        severity: {
                          type: "string",
                          enum: ["high", "medium", "low"],
                          description: "high=kritik risk, medium=dikkat gerekli, low=pozitif/normal",
                        },
                        title: { type: "string", description: "Kısa başlık (max 60 karakter)" },
                        analysis: { type: "string", description: "Detaylı sebep-sonuç analizi ve koç için tavsiye" },
                        actions: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              type: {
                                type: "string",
                                enum: ["supplement", "program", "message", "nutrition"],
                                description: "Aksiyon tipi. SADECE bu 4 değerden biri olmalı.",
                              },
                              label: { type: "string", description: "Buton metni (Örn: 'D Vitamini Başlat')" },
                              payload: { type: "string", description: "Sporcuya gönderilecek bildirim mesajı" },
                              is_quantitative: { type: "boolean", description: "ZORUNLU: Eylem matematiksel olarak (% ile) artırılıp azaltılabilecek bir şeyse (Örn: Antrenman hacmi, kalori, makro) true yap. Eylem sadece bir direktif, alışkanlık veya protokol ise (Örn: Su iç, esneme yap, hidrasyon sağla) false yap." },
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
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_athlete" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limit aşıldı, lütfen biraz bekleyin." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI kredi yetersiz." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: `AI hatası (${aiResponse.status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(aiResult));
      return new Response(
        JSON.stringify({ error: "AI yanıtı beklenen formatta değil." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const insights = parsed.insights || [];

    // ── 6. Auto-resolve previous scans for this athlete (prevent queue pollution) ──
    await adminClient
      .from("ai_weekly_analyses")
      .update({ resolved: true })
      .eq("athlete_id", athleteId)
      .eq("coach_id", coachId)
      .eq("resolved", false);

    // ── 7. Insert new analyses ──
    if (insights.length > 0) {
      const rows = insights.map((i: any) => ({
        athlete_id: athleteId,
        coach_id: coachId,
        severity: i.severity || "low",
        title: String(i.title).slice(0, 200),
        analysis: String(i.analysis).slice(0, 4000),
        athlete_name: athleteName,
        actions: Array.isArray(i.actions) ? i.actions : [],
      }));

      await adminClient.from("ai_weekly_analyses").insert(rows);
    }

    console.log(`[ai-doctor] ${athleteName}: ${insights.length} insights generated`);

    return new Response(JSON.stringify({ insights, athleteName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-doctor error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Bilinmeyen hata" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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
    let limit = 0;
    try {
      const body = await req.json();
      limit = Number(body.limit ?? 0);
    } catch { /* empty body is fine, default to 0 */ }

    const apiKey = Deno.env.get("RAPIDAPI_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "RAPIDAPI_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      `https://exercisedb.p.rapidapi.com/exercises?limit=${limit}&offset=0`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-host": "exercisedb.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("RapidAPI Error:", errorText);
      return new Response(
        JSON.stringify({ error: `API error (${response.status})` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log(`[fetch-exercises] Fetched ${Array.isArray(data) ? data.length : 0} exercises from ExerciseDB Pro`);

    const enriched = Array.isArray(data)
      ? data.map((ex: any) => ({
          ...ex,
          imageUrl: ex.id
            ? `https://exercisedb.p.rapidapi.com/image/${ex.id}?rapidapi-key=${apiKey}`
            : null,
        }))
      : data;

    return new Response(JSON.stringify(enriched), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("fetch-exercises error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

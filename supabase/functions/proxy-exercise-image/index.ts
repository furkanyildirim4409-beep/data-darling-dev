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
    const url = new URL(req.url);
    const exerciseId = url.searchParams.get("exerciseId");
    const resolution = url.searchParams.get("resolution") || "360";

    if (!exerciseId) {
      return new Response(JSON.stringify({ error: "exerciseId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("RAPIDAPI_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "RAPIDAPI_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageResponse = await fetch(
      `https://exercisedb.p.rapidapi.com/image?exerciseId=${exerciseId}&resolution=${resolution}`,
      {
        headers: {
          "x-rapidapi-host": "exercisedb.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
        },
      }
    );

    if (!imageResponse.ok) {
      console.error(`Image fetch failed for ${exerciseId}: ${imageResponse.status}`);
      return new Response(JSON.stringify({ error: `Image not found (${imageResponse.status})` }), {
        status: imageResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = imageResponse.headers.get("Content-Type") || "image/gif";
    const imageData = await imageResponse.arrayBuffer();

    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch (err) {
    console.error("proxy-exercise-image error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

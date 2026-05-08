// FatSecret food search + detail proxy (OAuth 2.0 client_credentials)
// Modes:
//   { query: string }   -> foods.search.v3 (returns flat items[])
//   { food_id: string } -> food.get.v4 (returns { food_id, name, brand, servings[] })

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CLIENT_ID = Deno.env.get("FATSECRET_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("FATSECRET_CLIENT_SECRET");

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("FatSecret credentials missing");
  }
  const basic = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const res = await fetch("https://oauth.fatsecret.com/connect/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=basic",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Token fetch failed: ${res.status} ${t}`);
  }
  const json = await res.json();
  const expiresIn = Number(json.expires_in ?? 3600);
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (expiresIn - 60) * 1000,
  };
  return cachedToken.value;
}

async function fsRequest(params: Record<string, string>) {
  const token = await getToken();
  const body = new URLSearchParams({ ...params, format: "json" });
  const res = await fetch("https://platform.fatsecret.com/rest/server.api", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`FatSecret error ${res.status}: ${t}`);
  }
  return await res.json();
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
};

function parseSearchMacros(desc: string) {
  // e.g. "Per 100g - Calories: 165kcal | Fat: 3.57g | Carbs: 0g | Protein: 31g"
  const cal = desc.match(/Calories:\s*([\d.]+)/i);
  const fat = desc.match(/Fat:\s*([\d.]+)/i);
  const carb = desc.match(/Carbs?:\s*([\d.]+)/i);
  const pro = desc.match(/Protein:\s*([\d.]+)/i);
  return {
    calories: cal ? num(cal[1]) : 0,
    fat: fat ? num(fat[1]) : 0,
    carbs: carb ? num(carb[1]) : 0,
    protein: pro ? num(pro[1]) : 0,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    const food_id = body?.food_id != null ? String(body.food_id) : "";

    // Detail mode
    if (food_id) {
      if (!/^\d+$/.test(food_id)) {
        return new Response(JSON.stringify({ error: "invalid food_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await fsRequest({ method: "food.get.v4", food_id });
      const food = data?.food;
      if (!food) {
        return new Response(JSON.stringify({ error: "not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // FatSecret quirk: serving may be object OR array
      const rawServings = food?.servings?.serving;
      const servingsArr = Array.isArray(rawServings)
        ? rawServings
        : rawServings
        ? [rawServings]
        : [];

      const servings = servingsArr.map((s: any, i: number) => ({
        serving_id: String(s.serving_id ?? i),
        serving_description: String(s.serving_description ?? ""),
        metric_serving_amount: num(s.metric_serving_amount),
        metric_serving_unit: String(s.metric_serving_unit ?? ""),
        calories: num(s.calories),
        protein: num(s.protein),
        carbs: num(s.carbohydrate),
        fat: num(s.fat),
        is_default: i === 0,
      }));

      return new Response(
        JSON.stringify({
          food_id: String(food.food_id ?? food_id),
          name: String(food.food_name ?? ""),
          brand: food.brand_name ? String(food.brand_name) : undefined,
          servings,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Search mode
    if (!query) {
      return new Response(
        JSON.stringify({ error: "query or food_id required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (query.length > 80) {
      return new Response(JSON.stringify({ error: "query too long" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await fsRequest({
      method: "foods.search.v3",
      search_expression: query,
      max_results: "20",
    });

    const rawFoods = data?.foods_search?.results?.food ?? data?.foods?.food;
    const foodsArr = Array.isArray(rawFoods)
      ? rawFoods
      : rawFoods
      ? [rawFoods]
      : [];

    const items = foodsArr.map((f: any) => {
      const desc = String(f.food_description ?? "");
      const macros = parseSearchMacros(desc);
      return {
        food_id: String(f.food_id ?? ""),
        name: String(f.food_name ?? ""),
        brand: f.brand_name ? String(f.brand_name) : undefined,
        ...macros,
      };
    });

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[search-food] error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Internal error" }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

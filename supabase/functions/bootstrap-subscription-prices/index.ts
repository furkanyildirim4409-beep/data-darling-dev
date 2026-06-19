// One-shot helper: creates Stripe products + recurring TRY prices for the 3 SaaS tiers.
// Returns the price IDs so the operator can store them as STRIPE_PRICE_* secrets.
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const TIERS = [
  { id: "starter", name: "Dynabolic Başlangıç", amount: 100000 },
  { id: "elite",   name: "Dynabolic Elit",      amount: 300000 },
  { id: "pro",     name: "Dynabolic Pro",       amount: 500000 },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Admin-only bootstrap utility. Require service-role bearer or CRON_SECRET.
  const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const ok = (svcKey && provided === svcKey) || (cronSecret && provided === cronSecret);
  if (!ok) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) {
    return new Response(JSON.stringify({ error: "stripe_not_configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const stripe = new Stripe(key, {
    apiVersion: "2026-04-22.dahlia" as unknown as Stripe.LatestApiVersion,
    httpClient: Stripe.createFetchHttpClient(),
  });

  const out: Record<string, string> = {};
  try {
    for (const t of TIERS) {
      const product = await stripe.products.create({ name: t.name });
      const price = await stripe.prices.create({
        product: product.id,
        currency: "try",
        unit_amount: t.amount,
        recurring: { interval: "month" },
      });
      out[t.id] = price.id;
    }
    return new Response(JSON.stringify({ ok: true, prices: out }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const e = err as { message?: string };
    return new Response(JSON.stringify({ error: "stripe_error", details: e?.message, partial: out }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

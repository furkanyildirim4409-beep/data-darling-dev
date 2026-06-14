// Periodic Stripe drift reconciliation. Triggered by pg_cron daily.
// Pulls every profile with a stripe_subscription_id, refetches the live
// subscription from Stripe, and patches profiles + logs subscription_events
// when the status/tier/period drifts.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Stripe Price ID -> internal tier (kept in sync with stripe-subscription-webhook)
const PRICE_TO_TIER: Record<string, "starter" | "pro" | "elite"> = {
  price_1TiFCwRsNTZwyhMjLpzmuXlt: "starter",
  price_1TiFCwRsNTZwyhMjEo4egJ89: "elite",
  price_1TiFCxRsNTZwyhMjFYeJdUlx: "pro",
};

const tierFromSubscription = (sub: Stripe.Subscription) => {
  const priceId = sub.items.data[0]?.price?.id;
  if (priceId && PRICE_TO_TIER[priceId]) return PRICE_TO_TIER[priceId];
  const envOverrides: Record<string, "starter" | "pro" | "elite"> = {
    [Deno.env.get("STRIPE_PRICE_STARTER") ?? ""]: "starter",
    [Deno.env.get("STRIPE_PRICE_PRO") ?? ""]: "elite",
    [Deno.env.get("STRIPE_PRICE_ELITE") ?? ""]: "pro",
  };
  if (priceId && envOverrides[priceId]) return envOverrides[priceId];
  return (sub.metadata?.requested_tier as "starter" | "pro" | "elite" | undefined) ?? null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: "Stripe is not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // Pull all coach profiles with an attached Stripe subscription
  const { data: rows, error } = await supabase
    .from("profiles")
    .select("id, subscription_status, subscription_tier, subscription_current_period_end, subscription_cancel_at_period_end, stripe_subscription_id, stripe_customer_id")
    .not("stripe_subscription_id", "is", null)
    .limit(2000);

  if (error) {
    console.error("Failed to load profiles for reconciliation", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let scanned = 0;
  let corrected = 0;
  let stale = 0;
  const failures: Array<{ coach_id: string; error: string }> = [];

  for (const row of rows ?? []) {
    scanned++;
    const subId = row.stripe_subscription_id as string;

    try {
      let sub: Stripe.Subscription | null = null;
      try {
        sub = await stripe.subscriptions.retrieve(subId);
      } catch (e: any) {
        // Stripe returns 404 (resource_missing) for deleted/unknown subs
        if (e?.code === "resource_missing" || e?.statusCode === 404) {
          sub = null;
        } else {
          throw e;
        }
      }

      if (!sub) {
        // Subscription no longer exists at Stripe — normalize to canceled
        if (row.subscription_status !== "canceled" || row.subscription_tier !== null) {
          await supabase.from("profiles").update({
            subscription_status: "canceled",
            subscription_tier: null,
            updated_at: new Date().toISOString(),
          }).eq("id", row.id);

          await supabase.from("subscription_events").insert({
            id: `cron_${subId}_${Date.now()}`,
            coach_id: row.id,
            stripe_subscription_id: subId,
            stripe_customer_id: row.stripe_customer_id,
            event_type: "cron.drift_correction",
            previous_status: row.subscription_status,
            new_status: "canceled",
            previous_tier: row.subscription_tier,
            new_tier: null,
            raw_payload: { reason: "stripe_subscription_missing" },
          });
          stale++;
          corrected++;
        }
        continue;
      }

      const liveStatus = sub.status;
      const liveTier = tierFromSubscription(sub);
      const livePeriodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;
      const liveCancelAtEnd = sub.cancel_at_period_end ?? false;

      const dbPeriodEnd = row.subscription_current_period_end
        ? new Date(row.subscription_current_period_end as string).toISOString()
        : null;

      const statusDrift = row.subscription_status !== liveStatus;
      const tierDrift = liveTier !== null && row.subscription_tier !== liveTier;
      const periodDrift = dbPeriodEnd !== livePeriodEnd;
      const cancelDrift = (row.subscription_cancel_at_period_end ?? false) !== liveCancelAtEnd;

      if (!statusDrift && !tierDrift && !periodDrift && !cancelDrift) continue;

      const patch: Record<string, unknown> = {
        subscription_status: liveStatus,
        subscription_current_period_end: livePeriodEnd,
        subscription_cancel_at_period_end: liveCancelAtEnd,
        updated_at: new Date().toISOString(),
      };
      if (tierDrift) patch.subscription_tier = liveTier;

      const { error: updErr } = await supabase.from("profiles").update(patch).eq("id", row.id);
      if (updErr) throw updErr;

      await supabase.from("subscription_events").insert({
        id: `cron_${subId}_${Date.now()}`,
        coach_id: row.id,
        stripe_subscription_id: subId,
        stripe_customer_id: row.stripe_customer_id,
        event_type: "cron.drift_correction",
        previous_status: row.subscription_status,
        new_status: liveStatus,
        previous_tier: row.subscription_tier,
        new_tier: liveTier ?? row.subscription_tier,
        raw_payload: {
          drift: { statusDrift, tierDrift, periodDrift, cancelDrift },
          live: {
            status: liveStatus,
            tier: liveTier,
            period_end: livePeriodEnd,
            cancel_at_period_end: liveCancelAtEnd,
          },
        },
      });
      corrected++;
    } catch (e: any) {
      console.error("Reconciliation failed for", row.id, e?.message ?? e);
      failures.push({ coach_id: row.id, error: e?.message ?? String(e) });
    }

    // Gentle rate-limit pause every 25 calls
    if (scanned % 25 === 0) await new Promise((r) => setTimeout(r, 200));
  }

  return new Response(
    JSON.stringify({ scanned, corrected, stale, failures }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

// Stripe webhook to sync coach subscription status into profiles.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Map Stripe Price IDs -> internal tier (NOTE: 'pro' and 'elite' swapped — 'pro' is now the 5000 TL plan)
const PRICE_TO_TIER: Record<string, "starter" | "pro" | "elite"> = {
  price_1TiFCwRsNTZwyhMjLpzmuXlt: "starter",
  price_1TiFCwRsNTZwyhMjEo4egJ89: "elite", // formerly pro
  price_1TiFCxRsNTZwyhMjFYeJdUlx: "pro",   // formerly elite
};

const tierFromSubscription = (sub: Stripe.Subscription) => {
  const priceId = sub.items.data[0]?.price?.id;
  if (priceId && PRICE_TO_TIER[priceId]) return PRICE_TO_TIER[priceId];
  // Env overrides: STRIPE_PRICE_PRO env still points to the 3000 TL price object,
  // but that price is now internally labelled 'elite'. Same for STRIPE_PRICE_ELITE.
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
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "Stripe is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Stripe signature verification failed", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const logEvent = async (params: {
    coachId: string | null;
    subId: string | null;
    customerId: string | null;
    previousStatus: string | null;
    newStatus: string | null;
    previousTier: string | null;
    newTier: string | null;
  }) => {
    const { error } = await supabase.from("subscription_events").upsert(
      {
        id: event.id,
        coach_id: params.coachId,
        stripe_subscription_id: params.subId,
        stripe_customer_id: params.customerId,
        event_type: event.type,
        previous_status: params.previousStatus,
        new_status: params.newStatus,
        previous_tier: params.previousTier,
        new_tier: params.newTier,
        raw_payload: event as unknown as Record<string, unknown>,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (error) console.warn("Failed to log subscription_event", event.id, error);
  };

  const upsertFromSubscription = async (
    sub: Stripe.Subscription,
    fallbackCoachId?: string | null,
  ) => {
    const coachId =
      (sub.metadata?.coach_id as string | undefined) ?? fallbackCoachId ?? null;
    if (!coachId) {
      console.warn("Subscription has no coach_id metadata", sub.id);
      await logEvent({
        coachId: null,
        subId: sub.id,
        customerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
        previousStatus: null,
        newStatus: sub.status,
        previousTier: null,
        newTier: tierFromSubscription(sub),
      });
      return;
    }

    // Snapshot current DB values to record drift / transition
    const { data: existing } = await supabase
      .from("profiles")
      .select("subscription_status, subscription_tier")
      .eq("id", coachId)
      .maybeSingle();

    const previousStatus = existing?.subscription_status ?? null;
    const previousTier = existing?.subscription_tier ?? null;

    // Normalize: on deletion, force canceled + null tier
    const isDeleted = event.type === "customer.subscription.deleted";
    const tier = isDeleted ? null : tierFromSubscription(sub);
    const status = isDeleted ? "canceled" : sub.status;
    const periodEnd = sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null;
    const customerId =
      (typeof sub.customer === "string" ? sub.customer : sub.customer?.id) ?? null;

    const updatePayload: Record<string, unknown> = {
      subscription_status: status,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      subscription_current_period_end: periodEnd,
      subscription_cancel_at_period_end: sub.cancel_at_period_end ?? false,
      updated_at: new Date().toISOString(),
    };
    // Only overwrite tier when we have a confident value (or explicit cancel)
    if (tier !== null || isDeleted) updatePayload.subscription_tier = tier;

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", coachId);

    if (error) {
      console.error("Failed to update profile from subscription", coachId, error);
      throw error;
    }

    // Drift verification: re-read and reconcile if status mismatch
    const { data: verify } = await supabase
      .from("profiles")
      .select("subscription_status, subscription_tier")
      .eq("id", coachId)
      .maybeSingle();

    if (verify && verify.subscription_status !== status) {
      console.warn(
        `Status drift detected for ${coachId}: DB=${verify.subscription_status} Stripe=${status}. Reconciling.`,
      );
      await supabase
        .from("profiles")
        .update({ subscription_status: status, updated_at: new Date().toISOString() })
        .eq("id", coachId);
    }

    await logEvent({
      coachId,
      subId: sub.id,
      customerId,
      previousStatus,
      newStatus: status,
      previousTier,
      newTier: tier,
    });
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const coachId =
          (session.metadata?.coach_id as string | undefined) ??
          session.client_reference_id ??
          null;

        if (session.mode === "subscription" && session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertFromSubscription(sub, coachId);
        } else {
          await logEvent({
            coachId,
            subId: null,
            customerId:
              typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
            previousStatus: null,
            newStatus: null,
            previousTier: null,
            newTier: null,
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertFromSubscription(sub);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subId =
            typeof invoice.subscription === "string"
              ? invoice.subscription
              : invoice.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertFromSubscription(sub);
        }
        break;
      }
      default:
        // ignore other events
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook handler error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

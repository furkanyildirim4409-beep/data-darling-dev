// Stripe webhook to sync coach subscription status into profiles.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Map Stripe Price IDs -> internal tier
const PRICE_TO_TIER: Record<string, "starter" | "pro" | "elite"> = {
  price_1TiFCwRsNTZwyhMjLpzmuXlt: "starter",
  price_1TiFCwRsNTZwyhMjEo4egJ89: "pro",
  price_1TiFCxRsNTZwyhMjFYeJdUlx: "elite",
};

const tierFromSubscription = (sub: Stripe.Subscription) => {
  const priceId = sub.items.data[0]?.price?.id;
  if (priceId && PRICE_TO_TIER[priceId]) return PRICE_TO_TIER[priceId];
  const envOverrides: Record<string, "starter" | "pro" | "elite"> = {
    [Deno.env.get("STRIPE_PRICE_STARTER") ?? ""]: "starter",
    [Deno.env.get("STRIPE_PRICE_PRO") ?? ""]: "pro",
    [Deno.env.get("STRIPE_PRICE_ELITE") ?? ""]: "elite",
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

  const upsertFromSubscription = async (
    sub: Stripe.Subscription,
    fallbackCoachId?: string | null,
  ) => {
    const coachId =
      (sub.metadata?.coach_id as string | undefined) ?? fallbackCoachId ?? null;
    if (!coachId) {
      console.warn("Subscription has no coach_id metadata", sub.id);
      return;
    }

    const tier = tierFromSubscription(sub);
    const status = sub.status;
    const periodEnd = sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null;

    const { error } = await supabase
      .from("profiles")
      .update({
        subscription_tier: tier ?? undefined,
        subscription_status: status,
        stripe_customer_id:
          (typeof sub.customer === "string" ? sub.customer : sub.customer?.id) ?? null,
        stripe_subscription_id: sub.id,
        subscription_current_period_end: periodEnd,
        subscription_cancel_at_period_end: sub.cancel_at_period_end ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", coachId);

    if (error) {
      console.error("Failed to update profile from subscription", coachId, error);
      throw error;
    }
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

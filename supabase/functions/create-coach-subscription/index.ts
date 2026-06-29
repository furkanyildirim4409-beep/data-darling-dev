// Stripe Checkout Session creator for coach SaaS subscriptions
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.21.0";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// SECURITY: The client may ONLY submit a `tierId`. The Stripe `priceId` is
// resolved server-side from the TIER_PRICE_MAP below — never trust a client-
// supplied price. `.strict()` rejects any extra fields (e.g. an attacker trying
// to inject `priceId`) with a 400.
const BodySchema = z.object({
  tierId: z.enum(["starter", "pro", "elite"]),
}).strict();

// NOTE: 'pro' (5000 TL) and 'elite' (3000 TL) swapped — internal id 'pro' now
// resolves to the formerly-elite Stripe price, and vice versa.
const PRICE_ENV_BY_TIER: Record<"starter" | "pro" | "elite", string> = {
  starter: "STRIPE_PRICE_STARTER",
  pro: "STRIPE_PRICE_ELITE",
  elite: "STRIPE_PRICE_PRO",
};

// Authoritative server-side allow-list of acceptable Stripe Price IDs.
// Any resolved priceId MUST be a member of this set before being sent to
// Stripe — this defends against env-var tampering or fallback drift.
const ALLOWED_PRICE_IDS = new Set<string>([
  "price_1TiFCwRsNTZwyhMjLpzmuXlt",
  "price_1TiFCxRsNTZwyhMjFYeJdUlx",
  "price_1TiFCwRsNTZwyhMjEo4egJ89",
]);

const FALLBACK_PRICE_BY_TIER: Record<"starter" | "pro" | "elite", string> = {
  starter: "price_1TiFCwRsNTZwyhMjLpzmuXlt",
  pro: "price_1TiFCxRsNTZwyhMjFYeJdUlx",
  elite: "price_1TiFCwRsNTZwyhMjEo4egJ89",
};

const resolvePriceId = (tierId: "starter" | "pro" | "elite") => {
  const envName = PRICE_ENV_BY_TIER[tierId];
  const configuredValue = Deno.env.get(envName)?.trim();

  if (configuredValue?.startsWith("price_")) return configuredValue;

  if (configuredValue?.startsWith("prod_")) {
    console.warn(
      `${envName} contains a Stripe Product ID (${configuredValue}); using the known Stripe Price ID instead.`,
    );
  }

  return FALLBACK_PRICE_BY_TIER[tierId];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");

    if (!STRIPE_SECRET_KEY) {
      return json({ error: "Stripe is not configured" }, 500);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } =
      await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;
    const userEmail =
      (claimsData.claims.email as string | undefined) ?? undefined;

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        400,
      );
    }
    const { tierId } = parsed.data;

    const priceId = resolvePriceId(tierId);
    if (!priceId) {
      return json(
        {
          error: `Subscription tier "${tierId}" is not configured. Missing env var ${PRICE_ENV_BY_TIER[tierId]}.`,
        },
        500,
      );
    }

    // Final defence: even after server-side resolution, the priceId must be in
    // our authoritative allow-list. Blocks tampered env vars / fallback drift.
    if (!ALLOWED_PRICE_IDS.has(priceId)) {
      console.error("create-coach-subscription: resolved priceId not in allow-list", {
        tierId,
        priceId,
      });
      return json({ error: "Invalid subscription configuration" }, 500);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });

    const origin =
      req.headers.get("origin") ??
      req.headers.get("referer")?.replace(/\/$/, "") ??
      "https://app.dynabolic.co";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: userEmail,
      client_reference_id: userId,
      success_url: `${origin}/settings?subscription=success&tier=${tierId}`,
      cancel_url: `${origin}/settings?subscription=cancelled`,
      allow_promotion_codes: true,
      metadata: {
        coach_id: userId,
        requested_tier: tierId,
      },
      subscription_data: {
        metadata: {
          coach_id: userId,
          requested_tier: tierId,
        },
      },
    });

    if (!session.url) {
      return json({ error: "Stripe did not return a checkout URL" }, 500);
    }

    return json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("create-coach-subscription error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});

// Stripe Checkout Session creator for assigned_payments (custom coach invoices)
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

const BodySchema = z.object({ paymentId: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
    const userEmail = (claimsData.claims.email as string | undefined) ?? undefined;

    // --- Validate body ---
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const { paymentId } = parsed.data;

    // --- Fetch row (RLS scopes to athlete_id = auth.uid()) ---
    const { data: paymentRow, error: fetchErr } = await userClient
      .from("assigned_payments")
      .select("id, coach_id, athlete_id, title, description, amount, currency, status")
      .eq("id", paymentId)
      .maybeSingle();

    if (fetchErr) {
      console.error("Fetch error", fetchErr);
      return json({ error: "Could not load invoice" }, 500);
    }
    if (!paymentRow) return json({ error: "Invoice not found" }, 404);
    if (paymentRow.athlete_id !== userId) return json({ error: "Forbidden" }, 403);
    if (paymentRow.status !== "pending") {
      return json({ error: `Invoice already ${paymentRow.status}` }, 400);
    }
    if (!paymentRow.amount || Number(paymentRow.amount) <= 0) {
      return json({ error: "Invalid invoice amount" }, 400);
    }

    // --- Build URLs ---
    const origin =
      req.headers.get("origin") ||
      Deno.env.get("CLIENT_URL") ||
      "https://app.dynabolic.co";

    // --- Stripe session ---
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: (paymentRow.currency || "try").toLowerCase(),
            product_data: {
              name: paymentRow.title,
              description:
                paymentRow.description || "Dynabolic Özel Koçluk Hizmeti",
            },
            unit_amount: Math.round(Number(paymentRow.amount) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        payment_id: paymentRow.id,
        coach_id: paymentRow.coach_id,
        athlete_id: paymentRow.athlete_id,
        payment_type: "custom_assigned_invoice",
      },
      success_url: `${origin}/athlete/payments?success=true&payment_id=${paymentRow.id}`,
      cancel_url: `${origin}/athlete/payments?cancelled=true&payment_id=${paymentRow.id}`,
    });

    // --- Persist session id (service role; athlete cannot UPDATE per RLS) ---
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: updateErr } = await adminClient
      .from("assigned_payments")
      .update({ stripe_checkout_id: session.id })
      .eq("id", paymentRow.id);

    if (updateErr) {
      console.error("Failed to persist session id", updateErr);
      // non-fatal — still return the URL so the user can pay
    }

    return json({ url: session.url, sessionId: session.id }, 200);
  } catch (err) {
    console.error("create-custom-checkout error", err);
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return json({ error: msg }, 500);
  }
});

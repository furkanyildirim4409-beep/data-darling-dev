import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authenticated caller to prevent push-spam abuse.
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.slice(7);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const callerId = claims.claims.sub as string;

    const { user_id, athlete_id } = await req.json();

    if (!user_id) {
      return jsonResponse({ error: "user_id required" }, 400);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Authorization: caller may only test-push themselves, their athletes, or as admin.
    if (callerId !== user_id) {
      const [{ data: targetProfile }, { data: adminRole }] = await Promise.all([
        supabaseAdmin.from("profiles").select("coach_id").eq("id", user_id).maybeSingle(),
        supabaseAdmin.from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle(),
      ]);
      const isAdmin = !!adminRole;
      const isCoachOfTarget = targetProfile?.coach_id === callerId;
      if (!isAdmin && !isCoachOfTarget) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
    }

    const { data: subs, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (error || !subs || subs.length === 0) {
      return jsonResponse({ error: "No push subscriptions found", detail: error }, 404);
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    webpush.setVapidDetails(
      "mailto:noreply@dynabolic.app",
      vapidPublicKey,
      vapidPrivateKey,
    );

    const deepLinkUrl = athlete_id
      ? `/messages?athleteId=${athlete_id}`
      : `/messages`;

    const payload = JSON.stringify({
      title: "🔔 Test Bildirimi — Dynabolic",
      body: "Bu bir test bildirimidir. Tıklayarak mesajlara yönlendirileceksiniz.",
      data: {
        url: deepLinkUrl,
        coachUrl: deepLinkUrl,
        athleteUrl: deepLinkUrl,
      },
    });

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      ),
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log("Test push result:", { sent, failed, targetUser: user_id });

    return jsonResponse({ sent, failed, subscriptions: subs.length, deepLink: deepLinkUrl });
  } catch (err: any) {
    console.error("Test push error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, athlete_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: subs, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (error || !subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ error: "No push subscriptions found", detail: error }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    webpush.setVapidDetails(
      "mailto:noreply@dynabolic.app",
      vapidPublicKey,
      vapidPrivateKey,
    );

    // Deep-link: coach tıklarsa /messages?athleteId=... açılır
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

    return new Response(
      JSON.stringify({ sent, failed, subscriptions: subs.length, deepLink: deepLinkUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Test push error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

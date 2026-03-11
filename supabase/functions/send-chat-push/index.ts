import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TriggerPayload {
  type: string;
  table: string;
  record: {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    media_type?: string | null;
    media_url?: string | null;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: TriggerPayload = await req.json();
    const { record } = payload;

    if (!record?.receiver_id || !record?.sender_id || !record?.content) {
      return new Response(JSON.stringify({ error: "Missing fields in record" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { receiver_id, sender_id, content, media_type } = record;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get sender name
    const { data: senderProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", sender_id)
      .single();

    const senderName = senderProfile?.full_name || "Koçunuz";

    // Build preview text
    let previewText = content;
    if (media_type === "image") previewText = "📷 Fotoğraf";
    else if (media_type === "audio") previewText = "🎤 Ses kaydı";

    // Get push subscriptions for receiver
    const { data: subscriptions } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", receiver_id);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ status: "no_subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { default: webpush } = await import("https://esm.sh/web-push@3.6.7");

    webpush.setVapidDetails(
      "mailto:noreply@dynabolic.app",
      vapidPublicKey,
      vapidPrivateKey
    );

    const notificationPayload = JSON.stringify({
      title: `💬 ${senderName}`,
      body: previewText.length > 100 ? previewText.substring(0, 100) + "..." : previewText,
      icon: "/pwa-192x192.png",
      badge: "/favicon.ico",
      data: {
        coachUrl: `/messages?athleteId=${sender_id}`,
        athleteUrl: `/kokpit?openChat=true&coachId=${sender_id}`,
        senderId: sender_id,
      },
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notificationPayload
        )
      )
    );

    // Clean up expired subscriptions
    const expiredEndpoints = results
      .map((r, i) => (r.status === "rejected" && r.reason?.statusCode === 410 ? subscriptions[i].endpoint : null))
      .filter(Boolean);

    if (expiredEndpoints.length > 0) {
      await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({ status: "ok", sent, failed, cleaned: expiredEndpoints.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Push notification error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

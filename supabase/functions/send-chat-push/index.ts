import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, table, record } = await req.json();

    if (type !== "INSERT" || table !== "messages") {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sender_id, receiver_id, content, media_type } = record;
    if (!sender_id || !receiver_id || !content) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", sender_id)
      .single();

    const senderName = profile?.full_name || "Sistem";

    let previewText = content;
    if (media_type === "image") previewText = "📷 Fotoğraf gönderdi";
    else if (media_type === "audio") previewText = "🎤 Ses kaydı gönderdi";

    const { data: subs, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", receiver_id);

    if (error || !subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "no subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys missing!");
      throw new Error("VAPID keys not configured");
    }

    webpush.setVapidDetails(
      "mailto:noreply@dynabolic.app",
      vapidPublicKey,
      vapidPrivateKey,
    );

    const payload = JSON.stringify({
      title: `💬 ${senderName} sana yeni bir mesaj gönderdi`,
      body: previewText.length > 100 ? previewText.substring(0, 100) + "…" : previewText,
      data: {
        url: "/",
        coachUrl: `/messages?athleteId=${sender_id}`,
        athleteUrl: `/?openChat=true&coachId=${sender_id}`,
        senderId: sender_id,
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

    const expiredEndpoints = results
      .map((r, i) => r.status === "rejected" && r.reason?.statusCode === 410 ? subs[i].endpoint : null)
      .filter(Boolean);

    if (expiredEndpoints.length > 0) {
      await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
    }

    console.log("Push sent:", {
      sent: results.filter((r) => r.status === "fulfilled").length,
      failed: results.filter((r) => r.status === "rejected").length,
    });

    return new Response(
      JSON.stringify({
        sent: results.filter((r) => r.status === "fulfilled").length,
        failed: results.filter((r) => r.status === "rejected").length,
        cleaned: expiredEndpoints.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Chat push error:", err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

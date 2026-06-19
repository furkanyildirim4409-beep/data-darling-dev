import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const PUSH_WEBHOOK_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET");

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

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

    const isWebhook =
      payload?.type === "INSERT" && payload?.table === "messages" && payload?.record;

    // ---------- Authorization ----------
    if (isWebhook) {
      // Shape A: DB webhook — must present the shared webhook secret.
      const sig = req.headers.get("x-webhook-secret") || "";
      const authHeader = req.headers.get("authorization") || "";
      const bearerOk = authHeader === `Bearer ${SERVICE_KEY}`;
      const secretOk = !!PUSH_WEBHOOK_SECRET && sig === PUSH_WEBHOOK_SECRET;
      if (!bearerOk && !secretOk) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
    } else {
      // Shape B: Direct dispatch — require a valid caller JWT, and only
      // allow notifying a target if the caller IS the target, the coach of
      // the target, or an active team member of the target's coach.
      const authHeader = req.headers.get("authorization") || "";
      if (!authHeader.startsWith("Bearer ")) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      const token = authHeader.slice(7);
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
      const callerId = claims?.claims?.sub as string | undefined;
      if (claimsErr || !callerId) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      const targetUserId = payload?.userId as string | undefined;
      if (!targetUserId) {
        return jsonResponse({ error: "missing userId" }, 400);
      }

      if (callerId !== targetUserId) {
        // Allow if caller is the target's coach or an active team member.
        const { data: tgt } = await supabaseAdmin
          .from("profiles")
          .select("coach_id")
          .eq("id", targetUserId)
          .maybeSingle();
        const coachId = tgt?.coach_id as string | undefined;
        let allowed = !!coachId && callerId === coachId;
        if (!allowed && coachId) {
          const { data: tm } = await supabaseAdmin
            .from("team_members")
            .select("id")
            .eq("head_coach_id", coachId)
            .eq("user_id", callerId)
            .eq("status", "active")
            .maybeSingle();
          allowed = !!tm;
        }
        if (!allowed) {
          return jsonResponse({ error: "Forbidden" }, 403);
        }
      }
    }

    // ---------- Resolve target userId + notification payload ----------
    let targetUserId: string | null = null;
    let notifTitle = "Dynabolic";
    let notifBody = "";
    let notifData: Record<string, unknown> = { url: "/" };

    // Shape A: DB webhook for new chat message
    if (isWebhook) {
      const { sender_id, receiver_id, content, media_type } = payload.record;
      if (!sender_id || !receiver_id || !content) {
        return jsonResponse({ error: "missing fields" }, 400);
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", sender_id)
        .single();

      const senderName = profile?.full_name || "Sistem";

      let previewText = content as string;
      if (media_type === "image") previewText = "📷 Fotoğraf gönderdi";
      else if (media_type === "audio") previewText = "🎤 Ses kaydı gönderdi";

      targetUserId = receiver_id;
      notifTitle = `💬 ${senderName} sana yeni bir mesaj gönderdi`;
      notifBody = previewText.length > 100 ? previewText.substring(0, 100) + "…" : previewText;
      notifData = {
        url: "/",
        coachUrl: `/messages?athleteId=${sender_id}`,
        athleteUrl: `/?openChat=true&coachId=${sender_id}`,
        senderId: sender_id,
      };
    }
    // Shape B: Direct dispatch — { userId, title, body, data? }
    else if (payload?.userId && (payload?.title || payload?.body)) {
      targetUserId = payload.userId;
      notifTitle = payload.title || notifTitle;
      notifBody = payload.body || "";
      notifData = { url: "/", ...(payload.data ?? {}) };
    } else {
      return jsonResponse({ error: "unsupported payload shape" }, 400);
    }

    if (!targetUserId) {
      return jsonResponse({ error: "missing userId" }, 400);
    }



    // ---------- Fetch subscriptions ----------
    const { data: subs, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", targetUserId);

    if (error || !subs || subs.length === 0) {
      return jsonResponse({ skipped: true, reason: "no subscriptions" });
    }

    const pushPayload = JSON.stringify({
      title: notifTitle,
      body: notifBody,
      data: notifData,
    });

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          pushPayload,
        )
      ),
    );

    const expiredEndpoints = results
      .map((r, i) => r.status === "rejected" && (r.reason as any)?.statusCode === 410 ? subs[i].endpoint : null)
      .filter(Boolean) as string[];

    if (expiredEndpoints.length > 0) {
      await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    console.log("Push sent:", { userId: targetUserId, sent, failed, cleaned: expiredEndpoints.length });

    return jsonResponse({ sent, failed, cleaned: expiredEndpoints.length });
  } catch (err: any) {
    console.error("Chat push error:", err);
    return jsonResponse({ error: err.message || String(err) }, 500);
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_DIRECT_API_KEY")!;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Fetch template once
    const { data: template } = await admin
      .from("email_templates")
      .select("subject, body_html")
      .eq("name", "Üyelik Yenileme Hatırlatması")
      .eq("is_system", true)
      .limit(1)
      .single();

    if (!template) {
      console.warn("cron-retention-reminders: template not found");
      return new Response(JSON.stringify({ skipped: true, reason: "no_template" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find orders expiring in 2-3 days window (daily CRON deduplication)
    const now = new Date();
    const twoDaysOut = new Date(now.getTime() + 2 * 86400000).toISOString();
    const threeDaysOut = new Date(now.getTime() + 3 * 86400000).toISOString();

    const { data: expiringOrders, error: queryErr } = await admin
      .from("orders")
      .select("id, user_id, expires_at")
      .in("status", ["active", "paid"])
      .gt("expires_at", twoDaysOut)
      .lte("expires_at", threeDaysOut);

    if (queryErr) {
      console.error("cron-retention-reminders: query error", queryErr);
      return new Response(JSON.stringify({ error: "query_failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!expiringOrders || expiringOrders.length === 0) {
      console.log("cron-retention-reminders: no expiring orders found");
      return new Response(JSON.stringify({ sent: 0, errors: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromEmail = "support@dynabolic.co";
    const renewalLink = "https://app.dynabolic.co/pricing";
    let sent = 0;
    let errors = 0;

    for (const order of expiringOrders) {
      try {
        if (!order.user_id) continue;

        const { data: profile } = await admin
          .from("profiles")
          .select("full_name, email")
          .eq("id", order.user_id)
          .single();

        if (!profile?.email) {
          console.warn("cron-retention-reminders: no email for user", order.user_id);
          errors++;
          continue;
        }

        // Calculate remaining days
        const expiresAt = new Date(order.expires_at);
        const kalanGun = Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000);
        const userName = profile.full_name || "Kullanıcı";

        const replacements: Record<string, string> = {
          "{{isim}}": userName,
          "{{kalan_gun}}": String(kalanGun),
          "{{yenileme_linki}}": renewalLink,
        };

        let subject = template.subject;
        let bodyHtml = template.body_html;
        for (const [key, value] of Object.entries(replacements)) {
          const regex = new RegExp(key.replace(/[{}]/g, "\\$&"), "g");
          subject = subject.replace(regex, value);
          bodyHtml = bodyHtml.replace(regex, value);
        }

        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: `Dynabolic Destek <${fromEmail}>`,
            to: [profile.email],
            subject,
            html: bodyHtml,
          }),
        });

        if (!resendRes.ok) {
          const errBody = await resendRes.text();
          console.error("cron-retention-reminders: Resend error for", profile.email, errBody);
          errors++;
          continue;
        }

        // Log outbound email
        await admin.from("emails").insert({
          owner_id: order.user_id,
          direction: "outbound",
          from_email: fromEmail,
          to_email: profile.email,
          subject,
          body_html: bodyHtml,
          is_read: true,
        });

        sent++;
        console.log("cron-retention-reminders: sent to", profile.email);
      } catch (innerErr) {
        console.error("cron-retention-reminders: error processing order", order.id, innerErr);
        errors++;
      }
    }

    console.log(`cron-retention-reminders: complete. sent=${sent}, errors=${errors}`);

    return new Response(JSON.stringify({ sent, errors }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("cron-retention-reminders error:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

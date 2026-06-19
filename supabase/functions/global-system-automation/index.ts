import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // SECURITY: Reject unauthenticated callers. Supabase DB webhooks send
    // the service-role bearer; cron / internal callers may send x-webhook-secret.
    const cronSecret = Deno.env.get("CRON_SECRET");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("authorization") || "";
    const webhookHeader = req.headers.get("x-webhook-secret") || "";
    const bearerOk = authHeader === `Bearer ${serviceRoleKey}`;
    const secretOk = !!cronSecret && webhookHeader === cronSecret;
    if (!bearerOk && !secretOk) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const record = payload.record;

    if (!record?.id) {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const resendKey = Deno.env.get("RESEND_DIRECT_API_KEY")!;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // SECURITY: Always look up email/role/name from DB by id — never trust
    // the payload, otherwise an attacker who reaches this endpoint could
    // send legitimate-looking phishing emails to arbitrary addresses.
    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name, role")
      .eq("id", record.id)
      .single();

    if (!profile?.email || !profile?.role) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_profile" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeEmail = profile.email as string;
    const safeRole = profile.role as string;
    const safeName = profile.full_name || "Kullanıcı";

    // Determine template based on role
    const templateName = safeRole === "coach" ? "Kaptan Hoş Geldin" : "Premium Hoş Geldin";

    // Fetch template
    let { data: template } = await admin
      .from("email_templates")
      .select("subject, body_html")
      .eq("name", templateName)
      .eq("is_system", true)
      .limit(1)
      .single();

    // Fallback for coach template
    if (!template && templateName === "Kaptan Hoş Geldin") {
      const { data: fallback } = await admin
        .from("email_templates")
        .select("subject, body_html")
        .eq("name", "Premium Hoş Geldin")
        .eq("is_system", true)
        .limit(1)
        .single();
      template = fallback;
    }

    if (!template) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_template" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const loginLink = "https://app.dynabolic.co/login";
    const fromEmail = "system@dynabolic.co";

    const subject = template.subject
      .replace(/\{\{isim\}\}/g, safeName)
      .replace(/\{\{baslangic_linki\}\}/g, loginLink);

    const bodyHtml = template.body_html
      .replace(/\{\{isim\}\}/g, safeName)
      .replace(/\{\{baslangic_linki\}\}/g, loginLink);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: `Dynabolic Platform <${fromEmail}>`,
        to: [safeEmail],
        subject,
        html: bodyHtml,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("global-system-automation: Resend error", errBody);
      return new Response(JSON.stringify({ error: "resend_failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("emails").insert({
      owner_id: record.id,
      direction: "outbound",
      from_email: fromEmail,
      to_email: safeEmail,
      subject,
      body_html: bodyHtml,
      is_read: true,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("global-system-automation error:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

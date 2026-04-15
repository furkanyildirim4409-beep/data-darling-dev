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
    const payload = await req.json();
    const record = payload.record;

    if (!record?.id || !record?.email || !record?.role) {
      console.warn("global-system-automation: missing id, email, or role", record);
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_DIRECT_API_KEY")!;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Determine template based on role
    let templateName: string;
    if (record.role === "coach") {
      templateName = "Kaptan Hoş Geldin";
    } else {
      templateName = "Premium Hoş Geldin";
    }

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
      console.warn("global-system-automation: coach template not found, falling back to Premium");
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
      console.warn("global-system-automation: no template found");
      return new Response(JSON.stringify({ skipped: true, reason: "no_template" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const memberName = record.full_name || "Kullanıcı";
    const loginLink = "https://app.dynabolic.co/login";
    const fromEmail = "system@dynabolic.co";

    const subject = template.subject
      .replace(/\{\{isim\}\}/g, memberName)
      .replace(/\{\{baslangic_linki\}\}/g, loginLink);

    const bodyHtml = template.body_html
      .replace(/\{\{isim\}\}/g, memberName)
      .replace(/\{\{baslangic_linki\}\}/g, loginLink);

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: `Dynabolic Platform <${fromEmail}>`,
        to: [record.email],
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

    // Log outbound email
    await admin.from("emails").insert({
      owner_id: record.id,
      direction: "outbound",
      from_email: fromEmail,
      to_email: record.email,
      subject,
      body_html: bodyHtml,
      is_read: true,
    });

    console.log(`global-system-automation: ${record.role} welcome sent to`, record.email);

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

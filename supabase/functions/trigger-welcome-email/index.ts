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

    if (!record?.user_id || !record?.head_coach_id) {
      console.warn("trigger-welcome-email: missing user_id or head_coach_id", record);
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_DIRECT_API_KEY")!;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Fetch new member profile
    const { data: memberProfile } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", record.user_id)
      .single();

    if (!memberProfile?.email) {
      console.warn("trigger-welcome-email: member profile or email not found", record.user_id);
      return new Response(JSON.stringify({ skipped: true, reason: "no_member_profile" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch head coach profile
    const { data: coachProfile } = await admin
      .from("profiles")
      .select("full_name, username")
      .eq("id", record.head_coach_id)
      .single();

    if (!coachProfile?.username) {
      console.warn("trigger-welcome-email: coach profile or username not found", record.head_coach_id);
      return new Response(JSON.stringify({ skipped: true, reason: "no_coach_profile" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch premium welcome template
    const { data: template } = await admin
      .from("email_templates")
      .select("subject, body_html")
      .eq("name", "Premium Hoş Geldin")
      .eq("is_system", true)
      .limit(1)
      .single();

    if (!template) {
      console.warn("trigger-welcome-email: premium welcome template not found");
      return new Response(JSON.stringify({ skipped: true, reason: "no_template" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const memberName = memberProfile.full_name || "Kullanıcı";
    const coachName = coachProfile.full_name || "Coach";
    const coachUsername = coachProfile.username;
    const fromEmail = `${coachUsername}@dynabolic.co`;
    const loginLink = "https://app.dynabolic.co/login";

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
        from: `${coachName} <${fromEmail}>`,
        to: [memberProfile.email],
        subject,
        html: bodyHtml,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("trigger-welcome-email: Resend error", errBody);
      return new Response(JSON.stringify({ error: "resend_failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log outbound email
    await admin.from("emails").insert({
      owner_id: record.head_coach_id,
      direction: "outbound",
      from_email: fromEmail,
      to_email: memberProfile.email,
      subject,
      body_html: bodyHtml,
      is_read: true,
    });

    console.log("trigger-welcome-email: premium welcome sent to", memberProfile.email);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("trigger-welcome-email error:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

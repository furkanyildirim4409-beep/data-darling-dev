import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_DIRECT_API_KEY")!;

    // Verify user
    const anonClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;

    const { toEmail, subject, bodyText } = await req.json();
    if (!toEmail || !subject || !bodyText) {
      return new Response(JSON.stringify({ error: "Missing required fields: toEmail, subject, bodyText" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // ── Delegation check: is user a sub-coach with mail.manage? ──
    let sendAsUserId = userId;

    const { data: teamRow } = await adminClient
      .from("team_members")
      .select("head_coach_id, custom_permissions")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (teamRow) {
      const mailManage = (teamRow.custom_permissions as any)?.mail?.manage === true;
      if (mailManage && teamRow.head_coach_id) {
        // Delegated: send on behalf of the head coach
        sendAsUserId = teamRow.head_coach_id;
      }
    }

    // Fetch sender profile (could be head coach or self)
    const { data: profile, error: profileErr } = await adminClient
      .from("profiles")
      .select("full_name, username")
      .eq("id", sendAsUserId)
      .single();

    if (profileErr || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const coachName = profile.full_name || "Coach";
    const coachUsername = profile.username || "coach";
    const fromEmail = `${coachUsername}@dynabolic.co`;
    const htmlBody = bodyText.replace(/\n/g, "<br>");

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `${coachName} <${fromEmail}>`,
        to: [toEmail],
        subject,
        html: htmlBody,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend error:", errBody);
      return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Log outbound email — owner is the identity we sent as
    await adminClient.from("emails").insert({
      owner_id: sendAsUserId,
      direction: "outbound",
      from_email: fromEmail,
      to_email: toEmail,
      subject,
      body_text: bodyText,
      body_html: htmlBody,
      is_read: true,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("send-custom-email error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

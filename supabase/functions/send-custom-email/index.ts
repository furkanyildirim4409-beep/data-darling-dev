import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

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

    const anonClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const { toEmail, subject } = body;
    const bodyHtml: string | undefined = body.bodyHtml;
    const bodyText: string | undefined = body.bodyText;

    if (!toEmail || !subject || (!bodyHtml && !bodyText)) {
      return new Response(JSON.stringify({ error: "Missing required fields: toEmail, subject, and bodyHtml or bodyText" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Delegation check (sub-coach with mail.manage sends as head coach)
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
        sendAsUserId = teamRow.head_coach_id;
      }
    }

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

    // Prefer real HTML from rich text editor / template.
    // Only fall back to converting plain text when no HTML was provided.
    const finalHtml: string = bodyHtml && bodyHtml.trim().length > 0
      ? bodyHtml
      : `<p>${escapeHtml(bodyText || "").replace(/\n/g, "<br>")}</p>`;
    const finalText: string = bodyHtml && bodyHtml.trim().length > 0
      ? stripHtml(bodyHtml)
      : (bodyText || "");

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `${coachName} <${fromEmail}>`,
        to: [toEmail],
        subject,
        html: finalHtml,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend error:", errBody);
      return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await adminClient.from("emails").insert({
      owner_id: sendAsUserId,
      direction: "outbound",
      from_email: fromEmail,
      to_email: toEmail,
      subject,
      body_text: finalText,
      body_html: finalHtml,
      is_read: true,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("send-custom-email error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

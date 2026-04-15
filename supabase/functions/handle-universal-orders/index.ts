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
    const oldRecord = payload.old_record;

    if (!record?.user_id) {
      console.warn("handle-universal-orders: missing user_id", record);
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine which event to handle
    const isInsert = payload.type === "INSERT";
    const isUpdate = payload.type === "UPDATE";
    const statusChanged = isUpdate && record.status !== oldRecord?.status;

    // Only act on: new paid orders OR status changes to paid/shipped
    const shouldSendPaid =
      (isInsert && record.status === "paid") ||
      (statusChanged && record.status === "paid");
    const shouldSendShipped = statusChanged && record.status === "shipped";

    if (!shouldSendPaid && !shouldSendShipped) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_actionable_status" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_DIRECT_API_KEY")!;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Fetch user profile
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", record.user_id)
      .single();

    if (!profile?.email) {
      console.warn("handle-universal-orders: user profile or email not found", record.user_id);
      return new Response(JSON.stringify({ skipped: true, reason: "no_profile" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userName = profile.full_name || "Kullanıcı";
    const fromEmail = "logistics@dynabolic.co";
    let templateName: string;
    let replacements: Record<string, string>;

    if (shouldSendPaid) {
      templateName = "Sipariş Onayı";

      // Extract package name from items
      let packageName = "Dynabolic Sipariş";
      try {
        const items = typeof record.items === "string" ? JSON.parse(record.items) : record.items;
        if (Array.isArray(items) && items.length > 0) {
          packageName = items.map((i: any) => i.title || i.name || "Ürün").join(", ");
        }
      } catch { /* use default */ }

      const orderRef = record.external_reference_id || record.id?.substring(0, 8)?.toUpperCase() || "N/A";
      const totalAmount = record.total_price != null ? `${record.total_price} ₺` : "—";

      replacements = {
        "{{isim}}": userName,
        "{{siparis_no}}": orderRef,
        "{{paket_adi}}": packageName,
        "{{tutar}}": totalAmount,
      };
    } else {
      templateName = "Kargon Yola Çıktı";
      replacements = {
        "{{isim}}": userName,
        "{{kargo_firmasi}}": record.carrier_name || "Belirtilmedi",
        "{{takip_no}}": record.tracking_number || "—",
        "{{takip_linki}}": record.tracking_url || "#",
      };
    }

    // Fetch template
    const { data: template } = await admin
      .from("email_templates")
      .select("subject, body_html")
      .eq("name", templateName)
      .eq("is_system", true)
      .limit(1)
      .single();

    if (!template) {
      console.warn("handle-universal-orders: template not found:", templateName);
      return new Response(JSON.stringify({ skipped: true, reason: "no_template" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply replacements
    let subject = template.subject;
    let bodyHtml = template.body_html;
    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(key.replace(/[{}]/g, "\\$&"), "g");
      subject = subject.replace(regex, value);
      bodyHtml = bodyHtml.replace(regex, value);
    }

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: `Dynabolic Lojistik <${fromEmail}>`,
        to: [profile.email],
        subject,
        html: bodyHtml,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("handle-universal-orders: Resend error", errBody);
      return new Response(JSON.stringify({ error: "resend_failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log outbound email
    await admin.from("emails").insert({
      owner_id: record.user_id,
      direction: "outbound",
      from_email: fromEmail,
      to_email: profile.email,
      subject,
      body_html: bodyHtml,
      is_read: true,
    });

    console.log(`handle-universal-orders: ${templateName} sent to`, profile.email);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("handle-universal-orders error:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

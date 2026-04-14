const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_DIRECT_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_DIRECT_API_KEY is not configured');

    const { coachName, leadName, leadEmail } = await req.json();

    if (!coachName || !leadName || !leadEmail) {
      return new Response(
        JSON.stringify({ error: 'coachName, leadName ve leadEmail zorunludur.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const html = `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Dynabolic</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="font-size:16px;color:#1a1a2e;margin:0 0 8px;">Merhaba <strong>${leadName}</strong>,</p>
            <p style="font-size:15px;color:#44475a;line-height:1.6;margin:0 0 24px;">
              <strong>${coachName}</strong> seni elit koçluk kadrosuna davet ediyor! 🚀
            </p>
            <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 32px;">
              Koçun, hikayelerimizi takip ettiğini fark etti ve seninle çalışmak istiyor. Kişiselleştirilmiş antrenman programları, beslenme planları ve birebir koçluk desteğiyle hedeflerine birlikte ulaşalım.
            </p>
            <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
              <a href="https://data-darling-dev.lovable.app" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                Uygulamaya Git ve Kabul Et
              </a>
            </td></tr></table>
            <p style="font-size:12px;color:#9ca3af;margin:32px 0 0;text-align:center;">
              Bu e-posta Dynabolic platformu üzerinden gönderilmiştir.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Dynabolic <onboarding@resend.dev>',
        to: [leadEmail],
        subject: `Dynabolic: ${coachName} Sizi Koçluk Kadrosuna Davet Ediyor! 🚀`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('send-coaching-invite error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Webhook } from "https://esm.sh/svix@1.21.0";
import { Resend } from 'npm:resend';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');
    const rawBody = await req.text();

    // Verify Svix signature if secret is configured
    if (webhookSecret) {
      const svixHeaders = {
        "svix-id": req.headers.get("svix-id") || "",
        "svix-timestamp": req.headers.get("svix-timestamp") || "",
        "svix-signature": req.headers.get("svix-signature") || "",
      };

      try {
        const wh = new Webhook(webhookSecret);
        wh.verify(rawBody, svixHeaders);
      } catch (err) {
        console.warn('inbound-email: Svix verification failed:', err);
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const payload = JSON.parse(rawBody);
    console.log('inbound-email: raw webhook payload:', JSON.stringify(payload));

    // Resend wraps email data inside payload.data
    const emailData = payload.data || payload;
    const { from, to, subject, text, html, email_id } = emailData;

    console.log('inbound-email: extracted fields:', JSON.stringify({ from, to, subject, email_id }));

    let htmlBody = html || null;
    let textBody = text || null;

    // Fetch full inbound email content using the Resend SDK
    if (email_id) {
      const resendKey = Deno.env.get('RESEND_DIRECT_API_KEY');
      if (resendKey) {
        try {
          const resend = new Resend(resendKey);
          const { data: fetchedEmail, error: fetchErr } = await resend.emails.receiving.get(email_id);

          if (fetchedEmail) {
            htmlBody = fetchedEmail.html || htmlBody;
            textBody = fetchedEmail.text || textBody;
            console.log(`inbound-email: fetched full body via SDK for email_id=${email_id}`);
          } else {
            console.error('inbound-email: Resend SDK fetch failed:', fetchErr);
          }
        } catch (err) {
          console.error('inbound-email: error using Resend SDK:', err);
        }
      } else {
        console.warn('inbound-email: RESEND_DIRECT_API_KEY not set, skipping body fetch');
      }
    }

    // Extract clean email from `to`
    const rawTo = Array.isArray(to) ? to[0] : to;
    const toMatch = typeof rawTo === 'string'
      ? rawTo.match(/<([^>]+)>/) || [null, rawTo.trim()]
      : [null, ''];
    const cleanTo = (toMatch[1] || '').toLowerCase();

    // Extract clean email from `from`
    const rawFrom = Array.isArray(from) ? from[0] : (from || '');
    const fromMatch = typeof rawFrom === 'string'
      ? rawFrom.match(/<([^>]+)>/) || [null, rawFrom.trim()]
      : [null, ''];
    const cleanFrom = (fromMatch[1] || rawFrom || '').toLowerCase();

    // Extract username prefix
    const atIndex = cleanTo.indexOf('@');
    if (atIndex === -1) {
      console.warn('inbound-email: could not parse recipient:', rawTo);
      return new Response(JSON.stringify({ success: true, skipped: 'invalid_to' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const username = cleanTo.substring(0, atIndex);

    console.log('inbound-email: cleanTo:', cleanTo, 'cleanFrom:', cleanFrom, 'username:', username);

    // Lookup coach by username
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (profileErr) {
      console.error('inbound-email: profile lookup error:', profileErr);
    }

    if (!profile) {
      console.warn(`inbound-email: no profile found for username "${username}"`);
      return new Response(JSON.stringify({ success: true, skipped: 'no_profile' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert into emails table
    const { error: insertErr } = await supabaseAdmin.from('emails').insert({
      owner_id: profile.id,
      direction: 'inbound',
      from_email: cleanFrom,
      to_email: cleanTo,
      subject: subject || 'No Subject',
      body_html: htmlBody,
      body_text: textBody,
      is_read: false,
    });

    if (insertErr) {
      console.error('inbound-email: insert error:', insertErr);
      throw insertErr;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('inbound-email error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

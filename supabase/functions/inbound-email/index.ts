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

    const payload = JSON.parse(rawBody);
    const eventType: string = payload.type || payload.event || '';

    // === STRICT EVENT FILTER ===
    // Only `email.received` (Resend inbound) carries actual mail content.
    // All other event types (email.sent, email.delivered, email.bounced, email.complained,
    // email.opened, email.clicked, etc.) are noise and MUST be discarded before any DB insert.
    // This single guard kills the duplicate empty-row insertions.
    const INBOUND_EVENT_TYPES = new Set(['email.received', 'inbound.created', 'inbound.email']);
    if (eventType && !INBOUND_EVENT_TYPES.has(eventType)) {
      console.log(`inbound-email: skipping non-inbound event type "${eventType}"`);
      return new Response(JSON.stringify({ success: true, skipped: 'event_type', type: eventType }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailData = payload.data || payload;
    const { from, to, subject, text, html, email_id } = emailData;

    // Inbound emails MUST carry an email_id we can fetch full content for.
    if (!email_id) {
      console.warn('inbound-email: skipping payload without email_id');
      return new Response(JSON.stringify({ success: true, skipped: 'no_email_id' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let htmlBody = html || null;
    let textBody = text || null;

    // Fetch full inbound email content via Resend SDK
    const resendKey = Deno.env.get('RESEND_DIRECT_API_KEY');
    if (resendKey) {
      try {
        const resend = new Resend(resendKey);
        const { data: fetchedEmail, error: fetchErr } = await resend.emails.receiving.get(email_id);
        if (fetchedEmail) {
          htmlBody = fetchedEmail.html || htmlBody;
          textBody = fetchedEmail.text || textBody;
        } else if (fetchErr) {
          console.error('inbound-email: Resend SDK fetch failed:', fetchErr);
        }
      } catch (err) {
        console.error('inbound-email: error using Resend SDK:', err);
      }
    }

    // Defensive: if both bodies are still empty after SDK fetch, skip rather than insert a blank row.
    if (!htmlBody && !textBody) {
      console.warn(`inbound-email: skipping email_id=${email_id} — empty body after SDK fetch`);
      return new Response(JSON.stringify({ success: true, skipped: 'empty_body' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    const atIndex = cleanTo.indexOf('@');
    if (atIndex === -1) {
      console.warn('inbound-email: could not parse recipient:', rawTo);
      return new Response(JSON.stringify({ success: true, skipped: 'invalid_to' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const username = cleanTo.substring(0, atIndex);

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (profileErr) console.error('inbound-email: profile lookup error:', profileErr);

    if (!profile) {
      console.warn(`inbound-email: no profile for username "${username}"`);
      return new Response(JSON.stringify({ success: true, skipped: 'no_profile' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Idempotent insert: relies on UNIQUE INDEX on provider_message_id.
    // If Resend retries the webhook for the same email_id, the dup is silently ignored.
    const { error: insertErr } = await supabaseAdmin.from('emails').upsert(
      {
        owner_id: profile.id,
        direction: 'inbound',
        from_email: cleanFrom,
        to_email: cleanTo,
        subject: subject || 'No Subject',
        body_html: htmlBody,
        body_text: textBody,
        is_read: false,
        provider_message_id: email_id,
      },
      { onConflict: 'provider_message_id', ignoreDuplicates: true },
    );

    if (insertErr) {
      console.error('inbound-email: insert error:', insertErr);
      throw insertErr;
    }

    return new Response(JSON.stringify({ success: true, email_id }), {
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

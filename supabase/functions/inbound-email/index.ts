import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function verifyWebhookSignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  try {
    const parts = signature.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const signaturePart = parts.find(p => p.startsWith('v1='));
    if (!timestampPart || !signaturePart) return false;

    const timestamp = timestampPart.substring(2);
    const expectedSig = signaturePart.substring(3);

    const signedPayload = `${timestamp}.${payload}`;
    const computedSig = createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    return computedSig === expectedSig;
  } catch (e) {
    console.error('Signature verification error:', e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');
    const rawBody = await req.text();

    // Verify signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers.get('svix-signature');
      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        console.warn('inbound-email: invalid webhook signature');
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
    const { from, to, subject, text, html } = emailData;

    console.log('inbound-email: extracted fields:', JSON.stringify({ from, to, subject }));

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
      body_html: html || null,
      body_text: text || null,
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

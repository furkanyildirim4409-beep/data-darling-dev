/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { z } from 'https://esm.sh/zod@3.23.8'

import { WelcomeEmail } from '../_shared/email-templates/welcome.tsx'
import { NotificationEmail } from '../_shared/email-templates/notification.tsx'
import {
  renderOrderReceiptHtml,
  renderOrderReceiptText,
  type OrderReceiptItem,
} from '../_shared/email-templates/order-receipt.ts'
import {
  renderShippingNotificationHtml,
  renderShippingNotificationText,
} from '../_shared/email-templates/shipping-notification.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ---------- Validation ----------
const WelcomeData = z.object({
  name: z.string().max(200).optional(),
  role: z.string().optional(),
  owner_id: z.string().uuid().optional(),
  ctaUrl: z.string().url().optional(),
})

const NotificationData = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  recipientName: z.string().max(200).optional(),
  ctaLabel: z.string().max(80).optional(),
  ctaUrl: z.string().url().optional(),
  owner_id: z.string().uuid().optional(),
})

const OrderReceiptItemSchema = z.object({
  title: z.string().min(1).max(300),
  quantity: z.number().int().positive(),
  unitPrice: z.union([z.number(), z.string()]).optional(),
  lineTotal: z.union([z.number(), z.string()]).optional(),
})

const OrderReceiptData = z.object({
  recipientName: z.string().max(200).optional(),
  orderRef: z.string().min(1).max(80),
  items: z.array(OrderReceiptItemSchema).min(1).max(50),
  subtotal: z.string().optional(),
  shipping: z.string().optional(),
  total: z.string(),
  shippingAddress: z.string().max(1000).optional(),
  ctaUrl: z.string().url().optional(),
  owner_id: z.string().uuid().optional(),
})

const ShippingNotificationData = z.object({
  recipientName: z.string().max(200).optional(),
  orderId: z.string().min(1).max(80),
  shippingCompany: z.string().min(1).max(120),
  trackingNumber: z.string().min(1).max(120),
  trackingUrl: z.string().url().optional(),
  orderUrl: z.string().url().optional(),
  owner_id: z.string().uuid().optional(),
})

const RequestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('welcome'), to: z.string().email(), data: WelcomeData.default({}) }),
  z.object({ type: z.literal('notification'), to: z.string().email(), data: NotificationData }),
  z.object({ type: z.literal('order_receipt'), to: z.string().email(), data: OrderReceiptData }),
  z.object({ type: z.literal('shipping_notification'), to: z.string().email(), data: ShippingNotificationData }),
])

type ParsedRequest = z.infer<typeof RequestSchema>

// ---------- Rendering ----------
async function renderEmail(req: ParsedRequest): Promise<{ subject: string; html: string; text: string; ownerId?: string; from: string }> {
  let element: React.ReactElement
  let subject: string
  let from = 'Dynabolic <noreply@dynabolic.co>'
  let ownerId: string | undefined

async function renderEmail(req: ParsedRequest): Promise<{ subject: string; html: string; text: string; ownerId?: string; from: string }> {
  let from = 'Dynabolic <noreply@dynabolic.co>'
  let ownerId: string | undefined

  switch (req.type) {
    case 'welcome': {
      const element = React.createElement(WelcomeEmail, {
        name: req.data.name,
        ctaUrl: req.data.ctaUrl,
      })
      const subject = 'Dynabolic ailesine hoş geldin ⚡'
      ownerId = req.data.owner_id
      const [html, text] = await Promise.all([
        renderAsync(element),
        renderAsync(element, { plainText: true }),
      ])
      return { subject, html, text, ownerId, from }
    }
    case 'notification': {
      const element = React.createElement(NotificationEmail, req.data)
      const subject = req.data.title
      ownerId = req.data.owner_id
      from = 'Dynabolic <notify@dynabolic.co>'
      const [html, text] = await Promise.all([
        renderAsync(element),
        renderAsync(element, { plainText: true }),
      ])
      return { subject, html, text, ownerId, from }
    }
    case 'order_receipt': {
      const data = { ...req.data, items: req.data.items as OrderReceiptItem[] }
      const html = renderOrderReceiptHtml(data)
      const text = renderOrderReceiptText(data)
      const subject = `Sipariş #${data.orderRef} onaylandı — ${data.total}`
      ownerId = data.owner_id
      from = 'Dynabolic <orders@dynabolic.co>'
      return { subject, html, text, ownerId, from }
    }
    case 'shipping_notification': {
      const html = renderShippingNotificationHtml(req.data)
      const text = renderShippingNotificationText(req.data)
      const subject = `Siparişin yola çıktı — Takip #${req.data.trackingNumber}`
      ownerId = req.data.owner_id
      from = 'Dynabolic Lojistik <logistics@dynabolic.co>'
      return { subject, html, text, ownerId, from }
    }
  }
}

// ---------- Auth ----------
async function authorize(req: Request): Promise<{ ok: boolean; userId?: string; isServer?: boolean }> {
  const cronSecret = Deno.env.get('CRON_SECRET')
  const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const auth = req.headers.get('authorization') || ''
  const webhookHeader = req.headers.get('x-webhook-secret') || ''

  if (cronSecret && webhookHeader === cronSecret) return { ok: true, isServer: true }
  if (svcKey && auth === `Bearer ${svcKey}`) return { ok: true, isServer: true }

  if (!auth.startsWith('Bearer ')) return { ok: false }

  // JWT path — must be a valid signed-in user
  const supaUrl = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supaUrl || !anon) return { ok: false }

  const supa = createClient(supaUrl, anon, { global: { headers: { Authorization: auth } } })
  const token = auth.replace('Bearer ', '')
  const { data, error } = await supa.auth.getClaims(token)
  if (error || !data?.claims?.sub) return { ok: false }
  return { ok: true, userId: data.claims.sub as string }
}

// ---------- Main ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authResult = await authorize(req)
    if (!authResult.ok) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const rawBody = await req.json()
    const parsed = RequestSchema.safeParse(rawBody)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const resendKey = Deno.env.get('RESEND_DIRECT_API_KEY')
    if (!resendKey) {
      console.error('send-email: RESEND_DIRECT_API_KEY missing')
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { subject, html, text, ownerId, from } = await renderEmail(parsed.data)
    const fromAddress = from.match(/<(.+)>/)?.[1] ?? from

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from,
        to: [parsed.data.to],
        subject,
        html,
        text,
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@dynabolic.co>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    })

    if (!resendRes.ok) {
      const errBody = await resendRes.text()
      console.error('send-email: Resend error', resendRes.status, errBody)
      return new Response(JSON.stringify({ error: 'send_failed', detail: errBody }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Log outbound
    try {
      const supaUrl = Deno.env.get('SUPABASE_URL')!
      const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const admin = createClient(supaUrl, svc)
      const logOwner = ownerId ?? authResult.userId
      if (logOwner) {
        await admin.from('emails').insert({
          owner_id: logOwner,
          direction: 'outbound',
          from_email: fromAddress,
          to_email: parsed.data.to,
          subject,
          body_html: html,
          is_read: true,
        })
      }
    } catch (logErr) {
      console.warn('send-email: log insert failed', logErr)
    }

    console.log(`send-email: ${parsed.data.type} sent to ${parsed.data.to}`)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-email error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

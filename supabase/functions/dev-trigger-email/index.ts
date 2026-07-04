// Dev/test trigger for the order_receipt email.
// Two modes:
//   1) Passthrough: { type, to, data }  → forwards straight to send-email
//   2) Order-by-id: { orderId, to? }     → loads orders row, enriches from Shopify
//      (fetches shopify_order_number, order_status_url, product images + descriptions),
//      persists them to the DB, then invokes send-email.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { shopifyAdminGraphQL } from "../_shared/shopify-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatMoney(amount: unknown, currency = "TRY") {
  if (amount == null) return undefined;
  const n = typeof amount === "number" ? amount : parseFloat(String(amount));
  if (!isFinite(n)) return String(amount);
  const symbol = currency === "TRY" ? "₺" : currency;
  return `${n.toFixed(2)} ${symbol}`;
}

async function enrichFromShopify(externalRefId: string | null | undefined, items: any[]) {
  const out: any = { orderNumber: null, orderStatusUrl: null, enrichedItems: items };
  if (!externalRefId) return out;

  // externalRefId looks like: gid://shopify/Order/6653977362621
  const shopifyOrderGid = externalRefId.startsWith("gid://")
    ? externalRefId
    : `gid://shopify/Order/${externalRefId}`;

  try {
    const q = `
      query($id: ID!) {
        order(id: $id) {
          id
          name
          statusPageUrl
          lineItems(first: 50) {
            edges {
              node {
                title
                quantity
                product {
                  id
                  descriptionHtml
                  featuredImage { url }
                }
                image { url }
              }
            }
          }
        }
      }`;
    const data: any = await shopifyAdminGraphQL(q, { id: shopifyOrderGid });
    const ord = data?.order;
    if (!ord) return out;
    out.orderNumber = ord.name ? String(ord.name).replace(/^#/, "") : null;
    out.orderStatusUrl = ord.statusPageUrl ?? null;

    const shopifyItems = (ord.lineItems?.edges ?? []).map((e: any) => e.node);
    // Match by title/index; overlay image + description
    out.enrichedItems = items.map((it, idx) => {
      const src = shopifyItems.find((s: any) => s.title === it.title) ?? shopifyItems[idx];
      return {
        ...it,
        image: it.image ?? src?.image?.url ?? src?.product?.featuredImage?.url,
        description: it.description ?? src?.product?.descriptionHtml,
      };
    });
  } catch (e) {
    console.warn("dev-trigger-email enrich failed:", (e as Error).message);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, svcKey);

    const payload = await req.json();

    // Mode 1: passthrough
    if (payload?.type && payload?.to) {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${svcKey}` },
        body: JSON.stringify(payload),
      });
      return new Response(await res.text(), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 2: build from orderId
    const orderId = payload?.orderId;
    if (!orderId) return json({ error: "orderId or {type,to,data} required" }, 400);

    const { data: order, error: ordErr } = await admin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (ordErr || !order) return json({ error: "order not found", detail: ordErr?.message }, 404);

    // Resolve recipient
    let to = payload?.to;
    if (!to && order.user_id) {
      const { data: prof } = await admin
        .from("profiles")
        .select("email")
        .eq("id", order.user_id)
        .maybeSingle();
      to = prof?.email;
    }
    if (!to) return json({ error: "no recipient email" }, 400);

    // Build items from stored order.items JSON
    const rawItems = Array.isArray(order.items) ? order.items : [];
    const baseItems = rawItems.map((it: any) => ({
      title: String(it?.title ?? "Ürün"),
      quantity: Number(it?.quantity ?? 1),
      unitPrice: formatMoney(it?.discountedPrice ?? it?.price),
      lineTotal: formatMoney((it?.discountedPrice ?? it?.price ?? 0) * Number(it?.quantity ?? 1)),
      image: it?.image ?? undefined,
      description: undefined,
    }));

    // Enrich from Shopify (image, description, order number, status URL)
    const enrichment = await enrichFromShopify(order.external_reference_id, baseItems);

    // Persist new fields to DB
    const patch: Record<string, unknown> = {};
    if (enrichment.orderNumber && !order.shopify_order_number) {
      patch.shopify_order_number = enrichment.orderNumber;
    }
    if (enrichment.orderStatusUrl && !order.shopify_order_status_url) {
      patch.shopify_order_status_url = enrichment.orderStatusUrl;
    }
    if (Object.keys(patch).length > 0) {
      await admin.from("orders").update(patch).eq("id", order.id);
    }

    const orderRef =
      enrichment.orderNumber ??
      order.shopify_order_number ??
      `ORD-${String(order.id).replace(/-/g, "").slice(0, 4).toUpperCase()}`;

    const total = formatMoney(order.total_price) ?? "—";
    const ctaUrl =
      enrichment.orderStatusUrl ??
      order.shopify_order_status_url ??
      `https://app.dynabolic.co/orders/${order.id}`;

    const emailPayload = {
      type: "order_receipt",
      to,
      data: {
        orderRef,
        items: enrichment.enrichedItems.length > 0 ? enrichment.enrichedItems : baseItems,
        total,
        ctaUrl,
      },
    };

    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${svcKey}` },
      body: JSON.stringify(emailPayload),
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dev-trigger-email error:", e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

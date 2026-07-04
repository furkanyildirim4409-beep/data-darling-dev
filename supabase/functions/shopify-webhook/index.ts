import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-topic, x-shopify-shop-domain",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---- HMAC verification ----
async function verifyHmac(rawBody: string, signature: string, secret: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
    // constant-time compare
    if (expected.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    return diff === 0;
  } catch (e) {
    console.error("shopify-webhook: HMAC error", e);
    return false;
  }
}

// ---- send-email invocation ----
async function callSendEmail(payload: Record<string, unknown>) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${svcKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("shopify-webhook: send-email failed", res.status, t);
    return false;
  }
  return true;
}

// ---- idempotency: skip if same subject/to already logged recently ----
async function alreadySent(admin: ReturnType<typeof createClient>, to: string, subject: string, hours = 24) {
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const { data } = await admin
    .from("emails")
    .select("id")
    .eq("to_email", to)
    .eq("subject", subject)
    .gte("created_at", since)
    .limit(1);
  return !!(data && data.length > 0);
}

// ---- payload handlers ----
function formatMoney(amount: unknown, currency?: string) {
  if (amount == null) return undefined;
  const n = typeof amount === "number" ? amount : parseFloat(String(amount));
  if (!isFinite(n)) return String(amount);
  const cur = currency || "TRY";
  const symbol = cur === "TRY" ? "₺" : cur;
  return `${n.toFixed(2)} ${symbol}`;
}

function shopifyGidFromNumericId(id: unknown) {
  const raw = String(id ?? "").trim();
  return raw ? `gid://shopify/Order/${raw}` : null;
}

async function resolveOrderForFulfillment(payload: any, admin: ReturnType<typeof createClient>) {
  const orderGid = payload?.order?.admin_graphql_api_id ?? shopifyGidFromNumericId(payload?.order_id ?? payload?.order?.id);
  if (!orderGid) return null;

  const { data } = await admin
    .from("orders")
    .select("id, user_id, shopify_order_number, shopify_order_status_url, external_reference_id")
    .eq("external_reference_id", orderGid)
    .maybeSingle();
  return data ?? { external_reference_id: orderGid };
}

async function handleOrder(payload: any, admin: ReturnType<typeof createClient>) {
  const to = payload?.email || payload?.contact_email || payload?.customer?.email;
  if (!to) {
    console.log("shopify-webhook: no customer email on order", payload?.id);
    return { skipped: true, reason: "no_email" };
  }

  const orderNumber = payload?.order_number != null ? String(payload.order_number) : null;
  const orderName = payload?.name ? String(payload.name).replace(/^#/, "") : null;
  const orderRef = orderNumber ?? orderName ?? String(payload?.id ?? "");
  const currency = payload?.currency;
  const orderStatusUrl = payload?.order_status_url ?? null;
  const shopifyOrderGid = payload?.admin_graphql_api_id ?? `gid://shopify/Order/${payload?.id}`;

  const items = Array.isArray(payload?.line_items)
    ? payload.line_items.map((li: any) => ({
        title: String(li?.title ?? li?.name ?? "Ürün"),
        quantity: Number(li?.quantity ?? 1),
        unitPrice: formatMoney(li?.price, currency),
        lineTotal:
          li?.price != null && li?.quantity != null
            ? formatMoney(Number(li.price) * Number(li.quantity), currency)
            : undefined,
        image: li?.image?.src ?? li?.image_url ?? li?.product?.image?.src ?? undefined,
        description: li?.product?.body_html ?? li?.body_html ?? undefined,
        product_id: li?.product_id,
      }))
    : [];

  // Enrich missing image/description via Shopify Admin API (best effort, non-blocking on failure).
  try {
    const needsLookup = items.filter((i) => (!i.image || !i.description) && i.product_id);
    if (needsLookup.length > 0) {
      const { shopifyAdminGraphQL } = await import("../_shared/shopify-admin.ts");
      const uniqueIds = [...new Set(needsLookup.map((i) => `gid://shopify/Product/${i.product_id}`))];
      const query = `query($ids:[ID!]!){ nodes(ids:$ids){ ... on Product { id descriptionHtml featuredImage { url } } } }`;
      const data: any = await shopifyAdminGraphQL(query, { ids: uniqueIds });
      const byId: Record<string, { image?: string; description?: string }> = {};
      for (const n of data?.nodes ?? []) {
        if (!n?.id) continue;
        byId[n.id] = { image: n.featuredImage?.url, description: n.descriptionHtml };
      }
      for (const it of items) {
        const gid = `gid://shopify/Product/${it.product_id}`;
        if (!it.image && byId[gid]?.image) it.image = byId[gid].image;
        if (!it.description && byId[gid]?.description) it.description = byId[gid].description;
      }
    }
  } catch (e) {
    console.warn("shopify-webhook: product enrichment failed", (e as Error)?.message);
  }

  // Drop product_id (internal-only) before sending to email.
  const emailItems = items.map(({ product_id: _p, ...rest }) => rest);
  if (emailItems.length === 0) emailItems.push({ title: "Dynabolic Sipariş", quantity: 1 });

  const total = formatMoney(payload?.total_price, currency) ?? "—";
  const subtotal = formatMoney(payload?.subtotal_price, currency);
  const shipping = formatMoney(
    payload?.total_shipping_price_set?.shop_money?.amount ?? payload?.shipping_lines?.[0]?.price,
    currency,
  );
  const shippingAddress = payload?.shipping_address
    ? [
        payload.shipping_address.name,
        payload.shipping_address.address1,
        payload.shipping_address.address2,
        [payload.shipping_address.zip, payload.shipping_address.city].filter(Boolean).join(" "),
        payload.shipping_address.country,
      ]
        .filter(Boolean)
        .join("\n")
    : undefined;

  // Persist Shopify order number + status URL to DB (upsert by external_reference_id).
  try {
    const patch: Record<string, unknown> = {};
    if (orderNumber) patch.shopify_order_number = orderNumber;
    if (orderStatusUrl) patch.shopify_order_status_url = orderStatusUrl;
    if (Object.keys(patch).length > 0) {
      const { error: upErr } = await admin
        .from("orders")
        .update(patch)
        .eq("external_reference_id", shopifyOrderGid);
      if (upErr) console.warn("shopify-webhook: order db update warn", upErr.message);
    }
  } catch (e) {
    console.warn("shopify-webhook: order db update threw", (e as Error)?.message);
  }

  const subject = `Sipariş #${orderRef} onaylandı — ${total}`;
  if (await alreadySent(admin, to, subject)) {
    return { skipped: true, reason: "already_sent" };
  }

  const ok = await callSendEmail({
    type: "order_receipt",
    to,
    data: {
      recipientName: payload?.customer?.first_name || payload?.billing_address?.first_name || undefined,
      orderRef,
      items: emailItems,
      subtotal,
      shipping,
      total,
      shippingAddress,
      ctaUrl: orderStatusUrl ?? undefined,
    },
  });

  return { success: ok };
}

async function handleFulfillment(payload: any, admin: ReturnType<typeof createClient>) {
  const status = String(payload?.status ?? "").toLowerCase();
  const shipmentStatus = String(payload?.shipment_status ?? "").toLowerCase();

  const order = await resolveOrderForFulfillment(payload, admin);
  const orderRef =
    order?.shopify_order_number ||
    payload?.order?.name?.replace?.(/^#/, "") ||
    String(payload?.order_number ?? payload?.order_id ?? payload?.order?.id ?? "");

  const to =
    payload?.email ||
    payload?.destination?.email ||
    payload?.order?.email ||
    payload?.order?.customer?.email;

  if (!to) {
    console.log("shopify-webhook: fulfillment has no recipient email, order_ref=", orderRef);
    return { skipped: true, reason: "no_email" };
  }

  const orderUrl = order?.shopify_order_status_url ?? payload?.order?.order_status_url ?? undefined;
  const recipientName =
    payload?.destination?.first_name || payload?.order?.customer?.first_name || undefined;

  // ---- DELIVERED branch ----
  if (shipmentStatus === "delivered") {
    const deliveryDate = new Date(
      payload?.updated_at || payload?.delivered_at || Date.now(),
    ).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });

    const subject = `Siparişin teslim edildi — #${orderRef}`;
    if (await alreadySent(admin, to, subject)) return { skipped: true, reason: "already_sent" };

    const ok = await callSendEmail({
      type: "order_delivered",
      to,
      data: {
        recipientName,
        orderId: orderRef,
        deliveryDate,
        orderUrl,
        owner_id: order?.user_id ?? undefined,
      },
    });
    return { success: ok, kind: "delivered" };
  }

  // ---- SHIPPED branch ----
  if (status && status !== "success") {
    return { skipped: true, reason: `status_${status}` };
  }

  const trackingNumber =
    payload?.tracking_number || (Array.isArray(payload?.tracking_numbers) ? payload.tracking_numbers[0] : null);
  if (!trackingNumber) return { skipped: true, reason: "no_tracking_number" };

  const trackingUrl =
    payload?.tracking_url || (Array.isArray(payload?.tracking_urls) ? payload.tracking_urls[0] : undefined);
  const shippingCompany = payload?.tracking_company || "Kargo";

  const subject = `Siparişin yola çıktı — Takip #${trackingNumber}`;
  if (await alreadySent(admin, to, subject)) return { skipped: true, reason: "already_sent" };

  const ok = await callSendEmail({
    type: "shipping_notification",
    to,
    data: {
      recipientName,
      orderId: orderRef,
      shippingCompany,
      trackingNumber,
      trackingUrl,
      orderUrl,
      owner_id: order?.user_id ?? undefined,
    },
  });

  return { success: ok, kind: "shipped" };
}

async function handleOrderCancelled(payload: any, admin: ReturnType<typeof createClient>) {
  const to = payload?.email || payload?.contact_email || payload?.customer?.email;
  if (!to) return { skipped: true, reason: "no_email" };

  const orderNumber = payload?.order_number != null ? String(payload.order_number) : null;
  const orderName = payload?.name ? String(payload.name).replace(/^#/, "") : null;
  const orderRef = orderNumber ?? orderName ?? String(payload?.id ?? "");
  const currency = payload?.currency;

  // Total refunded across all refunds on the order, fallback to total_price.
  let refundNumeric = 0;
  const refunds = Array.isArray(payload?.refunds) ? payload.refunds : [];
  for (const r of refunds) {
    const txs = Array.isArray(r?.transactions) ? r.transactions : [];
    for (const t of txs) {
      const amt = parseFloat(String(t?.amount ?? "0"));
      if (isFinite(amt)) refundNumeric += amt;
    }
  }
  if (refundNumeric <= 0) {
    const totalPrice = parseFloat(String(payload?.total_price ?? "0"));
    if (isFinite(totalPrice)) refundNumeric = totalPrice;
  }
  const refundAmount = refundNumeric.toFixed(2);

  const reason = payload?.cancel_reason ? String(payload.cancel_reason) : undefined;
  const orderUrl = payload?.order_status_url ?? undefined;

  // Resolve owner_id via DB.
  const shopifyOrderGid = payload?.admin_graphql_api_id ?? `gid://shopify/Order/${payload?.id}`;
  const { data: orderRow } = await admin
    .from("orders")
    .select("user_id, shopify_order_number, shopify_order_status_url")
    .eq("external_reference_id", shopifyOrderGid)
    .maybeSingle();

  const subject = `Sipariş #${orderRef} iptal edildi — İade ${refundAmount}`;
  if (await alreadySent(admin, to, subject)) return { skipped: true, reason: "already_sent" };

  const ok = await callSendEmail({
    type: "order_cancelled",
    to,
    data: {
      recipientName: payload?.customer?.first_name || payload?.billing_address?.first_name || undefined,
      orderId: orderRow?.shopify_order_number ?? orderRef,
      refundAmount,
      reason,
      orderUrl: orderRow?.shopify_order_status_url ?? orderUrl,
      owner_id: orderRow?.user_id ?? undefined,
    },
  });

  return { success: ok };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const secret = Deno.env.get("SHOPIFY_WEBHOOK_SECRET");
    if (!secret) {
      console.error("shopify-webhook: SHOPIFY_WEBHOOK_SECRET missing");
      return json({ error: "Server not configured" }, 500);
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-shopify-hmac-sha256") || "";
    const topic = req.headers.get("x-shopify-topic") || "";

    const verified = await verifyHmac(rawBody, signature, secret);
    if (!verified) {
      console.warn("shopify-webhook: HMAC verification failed for topic", topic);
      return json({ error: "Invalid signature" }, 401);
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, svcKey);

    let result: unknown = { skipped: true, reason: "unhandled_topic" };
    switch (topic) {
      case "orders/create":
      case "orders/paid":
        result = await handleOrder(payload, admin);
        break;
      case "fulfillments/create":
      case "fulfillments/update":
        result = await handleFulfillment(payload, admin);
        break;
      case "orders/cancelled":
      case "refunds/create":
        result = await handleOrderCancelled(payload, admin);
        break;
      default:
        console.log("shopify-webhook: ignoring topic", topic);
    }

    return json({ ok: true, topic, result });
  } catch (err) {
    console.error("shopify-webhook error:", err);
    return json({ error: err instanceof Error ? err.message : "internal_error" }, 500);
  }
});

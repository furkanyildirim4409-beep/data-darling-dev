import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://esm.sh/zod@3.23.8";
import { shopifyAdminGraphQL, type ShopifyAdminError } from "../_shared/shopify-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DirectActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("ship"),
    orderId: z.string().uuid(),
    trackingNumber: z.string().min(1).max(255),
    trackingUrl: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? null : v),
      z.string().url().max(2_000).nullable().optional(),
    ),
    carrierName: z.string().min(1).max(120).default("Other"),
  }),
  z.object({
    action: z.literal("deliver"),
    orderId: z.string().uuid(),
  }),
]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mapShopifyError(err: ShopifyAdminError) {
  const msg = err.message ?? "";
  if (err.status === 403 || /access denied|required access/i.test(msg)) {
    return jsonResponse(
      {
        error: "ACCESS_DENIED",
        code: "ACCESS_DENIED",
        message:
          "Shopify sipariş güncelleme yetkisi eksik. Admin API için write_fulfillments ve write_merchant_managed_fulfillment_orders scope'larını kontrol edin.",
        requiredAccess: err.requiredAccess,
        shopifyMessage: msg,
      },
      403,
    );
  }
  if (err.status === 401) {
    return jsonResponse(
      {
        error: "UNAUTHORIZED",
        code: "UNAUTHORIZED",
        message: "Shopify Admin token geçersiz. SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET kontrol edilmeli.",
        shopifyMessage: msg,
      },
      401,
    );
  }
  return jsonResponse({ error: msg || "Shopify Admin hatası", status: err.status ?? 500 }, 502);
}

const ORDER_FULFILLMENT_QUERY = `
  query orderFulfillment($id: ID!) {
    order(id: $id) {
      id
      fulfillments(first: 10) {
        id
        status
      }
      fulfillmentOrders(first: 20) {
        nodes {
          id
          status
          supportedActions { action }
        }
      }
    }
  }`;

const FULFILLMENT_CREATE = `
  mutation fulfillmentCreate($fulfillment: FulfillmentInput!) {
    fulfillmentCreate(fulfillment: $fulfillment) {
      fulfillment { id status }
      userErrors { field message }
    }
  }`;

const FULFILLMENT_EVENT_CREATE = `
  mutation fulfillmentEventCreate($fulfillmentEvent: FulfillmentEventInput!) {
    fulfillmentEventCreate(fulfillmentEvent: $fulfillmentEvent) {
      fulfillmentEvent { id status }
      userErrors { field message }
    }
  }`;

function getOrderRef(record: any) {
  return (
    record?.shopify_order_number ||
    `ORD-${String(record?.id || "").replace(/-/g, "").slice(0, 4).toUpperCase()}`
  );
}

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

async function dispatchShippingNotification(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  admin: ReturnType<typeof createClient>;
  to: string;
  recipientName: string;
  ownerId?: string | null;
  order: any;
  trackingNumber: string;
  trackingUrl?: string | null;
  shippingCompany: string;
}) {
  const subject = `Siparişin yola çıktı — Takip #${params.trackingNumber}`;
  if (await alreadySent(params.admin, params.to, subject)) {
    return { skipped: true, reason: "already_sent" };
  }

  const sendRes = await fetch(`${params.supabaseUrl}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.serviceRoleKey}`,
    },
    body: JSON.stringify({
      type: "shipping_notification",
      to: params.to,
      data: {
        recipientName: params.recipientName,
        orderId: getOrderRef(params.order),
        shippingCompany: params.shippingCompany,
        trackingNumber: params.trackingNumber,
        ...(params.trackingUrl ? { trackingUrl: params.trackingUrl } : {}),
        ...(params.order?.shopify_order_status_url ? { orderUrl: params.order.shopify_order_status_url } : {}),
        ...(params.ownerId ? { owner_id: params.ownerId } : {}),
      },
    }),
  });

  if (!sendRes.ok) {
    const errBody = await sendRes.text();
    console.error("handle-universal-orders: send-email shipping_notification failed", errBody);
    return { error: "send_failed", detail: errBody };
  }

  return { success: true };
}

async function syncShopifyShipped(orderGid: string, trackingNumber: string, trackingUrl: string | null, carrierName: string) {
  const data = await shopifyAdminGraphQL<any>(ORDER_FULFILLMENT_QUERY, { id: orderGid });
  const order = data?.order;
  if (!order) throw new Error("Shopify order not found");

  const openFulfillmentOrders = (order.fulfillmentOrders?.nodes ?? []).filter((fo: any) => {
    const status = String(fo.status ?? "").toUpperCase();
    const actions = (fo.supportedActions ?? []).map((a: any) => String(a.action ?? "").toUpperCase());
    return !["CLOSED", "CANCELLED", "INCOMPLETE"].includes(status) && actions.includes("CREATE_FULFILLMENT");
  });

  if (openFulfillmentOrders.length === 0) {
    return {
      skipped: true,
      reason: "no_open_fulfillment_order",
      fulfillmentId: order.fulfillments?.[0]?.id ?? null,
    };
  }

  const result = await shopifyAdminGraphQL<any>(FULFILLMENT_CREATE, {
    fulfillment: {
      lineItemsByFulfillmentOrder: openFulfillmentOrders.map((fo: any) => ({ fulfillmentOrderId: fo.id })),
      trackingInfo: {
        company: carrierName,
        number: trackingNumber,
        ...(trackingUrl ? { url: trackingUrl } : {}),
      },
      notifyCustomer: true,
    },
  });

  const errors = result?.fulfillmentCreate?.userErrors ?? [];
  if (errors.length > 0) {
    throw new Error(`Shopify fulfillment failed: ${errors.map((e: any) => e.message).join(", ")}`);
  }

  return { fulfillmentId: result?.fulfillmentCreate?.fulfillment?.id ?? null };
}

async function syncShopifyDelivered(orderGid: string) {
  const data = await shopifyAdminGraphQL<any>(ORDER_FULFILLMENT_QUERY, { id: orderGid });
  const order = data?.order;
  if (!order) throw new Error("Shopify order not found");

  const fulfillment = (order.fulfillments ?? []).find((f: any) => f?.id);
  if (!fulfillment?.id) {
    return { skipped: true, reason: "no_fulfillment_to_mark_delivered" };
  }

  const result = await shopifyAdminGraphQL<any>(FULFILLMENT_EVENT_CREATE, {
    fulfillmentEvent: {
      fulfillmentId: fulfillment.id,
      status: "DELIVERED",
      happenedAt: new Date().toISOString(),
      message: "Order manually marked as delivered from Dynabolic logistics panel.",
    },
  });

  const errors = result?.fulfillmentEventCreate?.userErrors ?? [];
  if (errors.length > 0) {
    throw new Error(`Shopify delivery event failed: ${errors.map((e: any) => e.message).join(", ")}`);
  }

  return { fulfillmentId: fulfillment.id, eventId: result?.fulfillmentEventCreate?.fulfillmentEvent?.id ?? null };
}

async function handleDirectFulfillment(req: Request, payload: unknown) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);
  const token = authHeader.replace("Bearer ", "");

  const parsed = DirectActionSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonResponse({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, 400);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("handle-universal-orders: missing Supabase environment variables");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const supaUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: claimsErr } = await supaUser.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) return jsonResponse({ error: "Unauthorized" }, 401);
  const userId = claimsData.claims.sub as string;

  const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const [{ data: isCoach }, { data: isAdmin }, { data: profile }] = await Promise.all([
    supaAdmin.rpc("has_role", { _user_id: userId, _role: "coach" }),
    supaAdmin.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supaAdmin.from("profiles").select("role").eq("id", userId).maybeSingle(),
  ]);
  if (!isCoach && !isAdmin && profile?.role !== "coach") {
    return jsonResponse({ error: "Forbidden: coach or admin role required" }, 403);
  }

  const action = parsed.data;
  const { data: visibleOrder, error: visibleErr } = await supaUser
    .from("orders")
    .select("id")
    .eq("id", action.orderId)
    .maybeSingle();
  if (visibleErr) return jsonResponse({ error: visibleErr.message }, 500);
  if (!visibleOrder) return jsonResponse({ error: "Forbidden" }, 403);

  const { data: order, error: orderErr } = await supaAdmin
    .from("orders")
    .select("id, user_id, status, external_reference_id, tracking_number, tracking_url, carrier_name, shopify_order_number, shopify_order_status_url")
    .eq("id", action.orderId)
    .maybeSingle();
  if (orderErr) return jsonResponse({ error: orderErr.message }, 500);
  if (!order) return jsonResponse({ error: "Order not found" }, 404);

  const warnings: Record<string, unknown> = {};
  const externalRef = typeof order.external_reference_id === "string" ? order.external_reference_id : null;
  const shouldSyncShopify = externalRef?.startsWith("gid://shopify/Order/");

  try {
    if (action.action === "ship" && shouldSyncShopify) {
      const shopifyResult = await syncShopifyShipped(
        externalRef,
        action.trackingNumber.trim(),
        action.trackingUrl?.trim() || null,
        action.carrierName.trim() || "Other",
      );
      if (shopifyResult?.skipped) warnings.shopify = shopifyResult;
    }

    if (action.action === "deliver" && shouldSyncShopify) {
      const shopifyResult = await syncShopifyDelivered(externalRef);
      if (shopifyResult?.skipped) warnings.shopify = shopifyResult;
    }
  } catch (err) {
    if ((err as ShopifyAdminError).status) return mapShopifyError(err as ShopifyAdminError);
    return jsonResponse({ error: err instanceof Error ? err.message : "Shopify sync failed" }, 502);
  }

  const updatePayload =
    action.action === "ship"
      ? {
          status: "shipped",
          tracking_number: action.trackingNumber.trim(),
          tracking_url: action.trackingUrl?.trim() || null,
          carrier_name: action.carrierName.trim() || "Other",
          updated_at: new Date().toISOString(),
        }
      : {
          status: "completed",
          updated_at: new Date().toISOString(),
        };

  const { data: updatedOrder, error: updateErr } = await supaAdmin
    .from("orders")
    .update(updatePayload)
    .eq("id", action.orderId)
    .select("*")
    .single();
  if (updateErr) return jsonResponse({ error: `DB update failed: ${updateErr.message}` }, 500);

  const emailResult: Record<string, unknown> = {};
  if (action.action === "ship" && updatedOrder?.user_id) {
    const { data: profile } = await supaAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", updatedOrder.user_id)
      .maybeSingle();

    if (profile?.email) {
      emailResult.shippingEmail = await dispatchShippingNotification({
        supabaseUrl: SUPABASE_URL,
        serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
        admin: supaAdmin,
        to: profile.email,
        recipientName: profile.full_name || "Kullanıcı",
        ownerId: updatedOrder.user_id,
        order: updatedOrder,
        trackingNumber: action.trackingNumber.trim(),
        trackingUrl: action.trackingUrl?.trim() || null,
        shippingCompany: action.carrierName.trim() || "Kargo",
      });
    } else {
      emailResult.shippingEmail = { skipped: true, reason: "no_profile_email" };
    }
  }

  console.log(`handle-universal-orders: ${action.action} synced`, {
    orderId: action.orderId,
    externalReferenceId: externalRef,
    warnings,
  });

  return jsonResponse({
    success: true,
    order: updatedOrder,
    ...(Object.keys(warnings).length ? { warnings } : {}),
    ...(Object.keys(emailResult).length ? { email: emailResult } : {}),
  });
}

async function handleEmailWebhook(payload: any) {
  const record = payload.record;
  const oldRecord = payload.old_record;

  if (!record?.user_id) {
    console.warn("handle-universal-orders: missing user_id", record);
    return jsonResponse({ skipped: true });
  }

  const isInsert = payload.type === "INSERT";
  const isUpdate = payload.type === "UPDATE";
  const statusChanged = isUpdate && record.status !== oldRecord?.status;

  const shouldSendPaid =
    (isInsert && record.status === "paid") ||
    (statusChanged && record.status === "paid");
  const shouldSendShipped = statusChanged && record.status === "shipped";

  if (!shouldSendPaid && !shouldSendShipped) {
    return jsonResponse({ skipped: true, reason: "no_actionable_status" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("handle-universal-orders: missing email webhook environment variables");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", record.user_id)
    .single();

  if (!profile?.email) {
    console.warn("handle-universal-orders: user profile or email not found", record.user_id);
    return jsonResponse({ skipped: true, reason: "no_profile" });
  }

  const userName = profile.full_name || "Kullanıcı";

  // ---- PAID: send branded order-receipt via send-email ----
  if (shouldSendPaid) {
    const items: Array<{ title: string; quantity: number; lineTotal?: string }> = [];
    try {
      const raw = typeof record.items === "string" ? JSON.parse(record.items) : record.items;
      if (Array.isArray(raw)) {
        for (const i of raw) {
          items.push({
            title: String(i.title || i.name || "Ürün"),
            quantity: Number(i.quantity ?? 1),
            lineTotal: i.line_total != null ? String(i.line_total) : (i.price != null ? String(i.price) : undefined),
          });
        }
      }
    } catch { /* fall through with empty items */ }

    if (items.length === 0) {
      items.push({ title: "Dynabolic Sipariş", quantity: 1 });
    }

    const orderRef = getOrderRef(record);
    const totalStr = record.total_price != null ? `${record.total_price} ₺` : "—";

    const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        type: "order_receipt",
        to: profile.email,
        data: {
          recipientName: userName,
          orderRef,
          items,
          total: totalStr,
          shippingAddress: record.shipping_address ?? undefined,
          owner_id: record.user_id,
        },
      }),
    });

    if (!sendRes.ok) {
      const errBody = await sendRes.text();
      console.error("handle-universal-orders: send-email order_receipt failed", errBody);
      return jsonResponse({ error: "send_failed" });
    }

    console.log("handle-universal-orders: order_receipt dispatched for order", record.id);
    return jsonResponse({ success: true });
  }

  // ---- SHIPPED: dispatch branded Dynabolic Elite shipping_notification via send-email ----
  const trackingNumber = record.tracking_number;
  if (!trackingNumber) {
    return jsonResponse({ skipped: true, reason: "no_tracking_number" });
  }
  const shippingCompany = record.carrier_name || "Kargo";
  const trackingUrl = record.tracking_url || undefined;

  const result = await dispatchShippingNotification({
    supabaseUrl,
    serviceRoleKey,
    admin,
    to: profile.email,
    recipientName: userName,
    ownerId: record.user_id,
    order: record,
    trackingNumber,
    trackingUrl,
    shippingCompany,
  });

  if ((result as any).error) {
    return jsonResponse({ error: "send_failed" });
  }

  console.log("handle-universal-orders: shipping_notification dispatched for order", record.id);
  return jsonResponse({ success: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const payload = await req.json();
    if (payload?.action === "ship" || payload?.action === "deliver") {
      return await handleDirectFulfillment(req, payload);
    }

    // Webhook path — require service-role bearer or shared secret to prevent forged tracking emails
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const cronSecret = Deno.env.get("CRON_SECRET");
    const auth = req.headers.get("authorization") || "";
    const whs = req.headers.get("x-webhook-secret") || "";
    const okAuth = svcKey && auth === `Bearer ${svcKey}`;
    const okSecret = cronSecret && whs === cronSecret;
    if (!okAuth && !okSecret) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    return await handleEmailWebhook(payload);
  } catch (err) {
    console.error("handle-universal-orders error:", err);
    return jsonResponse({ error: err instanceof Error ? err.message : "internal_error" }, 500);
  }
});

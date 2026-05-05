// Edge function: delete-shopify-product
// Deletes a coach_products row + removes the product from Shopify in real-time.
// Auth: in-code JWT validation. Requires 'coach' or 'admin' role + row ownership.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://esm.sh/zod@3.23.8";
import { shopifyAdminGraphQL, type ShopifyAdminError } from "../_shared/shopify-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({ productId: z.string().uuid() });

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const PRODUCT_DELETE = `
  mutation productDelete($input: ProductDeleteInput!) {
    productDelete(input: $input) {
      deletedProductId
      userErrors { field message }
    }
  }`;

function mapShopifyError(err: ShopifyAdminError) {
  const msg = err.message ?? "";
  if (err.status === 403 || /access denied|required access/i.test(msg)) {
    return jsonResponse(
      {
        error: "ACCESS_DENIED",
        code: "ACCESS_DENIED",
        message:
          "Shopify yetkisi eksik. Dev Dashboard → App → Configuration üzerinden write_products scope'unu aktif edin.",
        shopifyMessage: msg,
      },
      403,
    );
  }
  if (err.status === 401) {
    return jsonResponse(
      { error: "UNAUTHORIZED", code: "UNAUTHORIZED", message: "Shopify Admin token geçersiz.", shopifyMessage: msg },
      401,
    );
  }
  return jsonResponse({ error: msg || "Shopify Admin hatası", status: err.status ?? 500 }, 502);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);
  const token = authHeader.replace("Bearer ", "");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supaUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: claimsErr } = await supaUser.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) return jsonResponse({ error: "Unauthorized" }, 401);
  const userId = claimsData.claims.sub as string;

  const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const [{ data: isCoach }, { data: isAdmin }] = await Promise.all([
    supaAdmin.rpc("has_role", { _user_id: userId, _role: "coach" }),
    supaAdmin.rpc("has_role", { _user_id: userId, _role: "admin" }),
  ]);
  if (!isCoach && !isAdmin) return jsonResponse({ error: "Forbidden" }, 403);

  let body: unknown;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, 400);
  }
  const { productId } = parsed.data;

  const { data: row, error: rowErr } = await supaAdmin
    .from("coach_products")
    .select("id, coach_id, shopify_product_id, image_url")
    .eq("id", productId)
    .maybeSingle();
  if (rowErr) return jsonResponse({ error: rowErr.message }, 500);
  if (!row) return jsonResponse({ error: "Not found" }, 404);
  if (row.coach_id !== userId) return jsonResponse({ error: "Forbidden" }, 403);

  const warnings: Record<string, unknown> = {};

  // 1) Shopify delete (best-effort but surface hard errors)
  if (row.shopify_product_id) {
    try {
      const res = await shopifyAdminGraphQL<any>(PRODUCT_DELETE, {
        input: { id: row.shopify_product_id },
      });
      const errs = res?.productDelete?.userErrors ?? [];
      if (errs.length > 0) {
        // If product already missing on Shopify, ignore; otherwise fail.
        const notFound = errs.some((e: any) => /not found|does not exist/i.test(e.message ?? ""));
        if (!notFound) return jsonResponse({ error: "Shopify delete failed", details: errs }, 400);
        warnings.shopify = errs;
      }
    } catch (err) {
      const e = err as ShopifyAdminError;
      // 404 from Shopify → already deleted; continue with DB delete.
      if (e.status && e.status !== 404) return mapShopifyError(e);
      warnings.shopify = e instanceof Error ? e.message : "unknown";
    }
  }

  // 2) DB delete
  const { error: delErr } = await supaAdmin
    .from("coach_products")
    .delete()
    .eq("id", productId)
    .eq("coach_id", userId);
  if (delErr) return jsonResponse({ error: `DB delete failed: ${delErr.message}` }, 500);

  // 3) Storage cleanup (best-effort)
  if (row.image_url && row.image_url.includes("/storage/v1/object/public/products/")) {
    try {
      const path = row.image_url.split("/storage/v1/object/public/products/")[1];
      if (path) await supaAdmin.storage.from("products").remove([path]);
    } catch { /* ignore */ }
  }

  return jsonResponse({ success: true, ...(Object.keys(warnings).length ? { warnings } : {}) });
});

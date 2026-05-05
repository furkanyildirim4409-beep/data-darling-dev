// Edge function: update-shopify-product
// Updates an existing coach_products row + syncs to Shopify Admin API in real-time.
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

const BodySchema = z.object({
  productId: z.string().uuid(),
  title: z.string().min(2).max(255).optional(),
  descriptionHtml: z.string().max(50_000).nullable().optional(),
  price: z.number().positive().optional(),
  category: z.string().max(255).nullable().optional(),
  stockQuantity: z.number().int().min(0).max(1_000_000).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface ShopifyUserError {
  field?: string[] | null;
  message: string;
}

const PRODUCT_UPDATE = `
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product { id }
      userErrors { field message }
    }
  }`;

const VARIANTS_BULK_UPDATE = `
  mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id price }
      userErrors { field message }
    }
  }`;

const PRODUCT_CREATE_MEDIA = `
  mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
    productCreateMedia(productId: $productId, media: $media) {
      media { ... on MediaImage { id alt } }
      mediaUserErrors { field message }
    }
  }`;

const VARIANT_INVENTORY_QUERY = `
  query variantInventory($id: ID!) {
    productVariant(id: $id) { id inventoryItem { id } }
  }`;

const LOCATIONS_QUERY = `
  query primaryLocation {
    locations(first: 1) { nodes { id } }
  }`;

const INVENTORY_SET_QUANTITIES = `
  mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      userErrors { field message code }
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
          "Shopify yetkisi eksik. Dev Dashboard → App → Configuration üzerinden write_products ve write_inventory scope'larını aktif edin.",
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
  const { productId, title, descriptionHtml, price, category, stockQuantity, imageUrl } = parsed.data;

  // Fetch row + verify ownership
  const { data: row, error: rowErr } = await supaAdmin
    .from("coach_products")
    .select("id, coach_id, shopify_product_id, shopify_variant_id, product_type, image_url, category")
    .eq("id", productId)
    .maybeSingle();
  if (rowErr) return jsonResponse({ error: rowErr.message }, 500);
  if (!row) return jsonResponse({ error: "Not found" }, 404);
  if (row.coach_id !== userId) return jsonResponse({ error: "Forbidden" }, 403);

  const isDigital = row.product_type === "digital";
  const warnings: Record<string, unknown> = {};

  try {
    // 1) productUpdate (title/description/category-tag)
    if (row.shopify_product_id && (title !== undefined || descriptionHtml !== undefined || category !== undefined)) {
      const tagCategory = category ?? row.category ?? null;
      const input: Record<string, unknown> = { id: row.shopify_product_id };
      if (title !== undefined) input.title = title;
      if (descriptionHtml !== undefined) input.descriptionHtml = descriptionHtml ?? "";
      if (category !== undefined) {
        input.productType = isDigital ? "Digital" : (category ?? "Physical");
        input.tags = [
          `coach:${userId}`,
          `type:${row.product_type}`,
          ...(tagCategory ? [`category:${tagCategory}`] : []),
        ];
      }
      const upd = await shopifyAdminGraphQL<any>(PRODUCT_UPDATE, { input });
      const errs: ShopifyUserError[] = upd.productUpdate.userErrors ?? [];
      if (errs.length > 0) return jsonResponse({ error: "productUpdate failed", details: errs }, 400);
    }

    // 2) Price update
    if (row.shopify_product_id && row.shopify_variant_id && price !== undefined) {
      const upd = await shopifyAdminGraphQL<any>(VARIANTS_BULK_UPDATE, {
        productId: row.shopify_product_id,
        variants: [{ id: row.shopify_variant_id, price: price.toFixed(2) }],
      });
      const errs: ShopifyUserError[] = upd.productVariantsBulkUpdate.userErrors ?? [];
      if (errs.length > 0) return jsonResponse({ error: "price update failed", details: errs }, 400);
    }

    // 3) Stock update (physical only)
    if (!isDigital && row.shopify_variant_id && stockQuantity !== undefined && stockQuantity !== null) {
      try {
        const invQ = await shopifyAdminGraphQL<any>(VARIANT_INVENTORY_QUERY, { id: row.shopify_variant_id });
        const inventoryItemId: string | undefined = invQ?.productVariant?.inventoryItem?.id;
        const locData = await shopifyAdminGraphQL<any>(LOCATIONS_QUERY, {});
        const locationId: string | undefined = locData?.locations?.nodes?.[0]?.id;
        if (inventoryItemId && locationId) {
          const invData = await shopifyAdminGraphQL<any>(INVENTORY_SET_QUANTITIES, {
            input: {
              name: "available",
              reason: "correction",
              ignoreCompareQuantity: true,
              quantities: [{ inventoryItemId, locationId, quantity: stockQuantity }],
            },
          });
          const errs: ShopifyUserError[] = invData?.inventorySetQuantities?.userErrors ?? [];
          if (errs.length > 0) warnings.inventory = errs;
        } else {
          warnings.inventory = "Missing inventoryItem or location";
        }
      } catch (e) {
        warnings.inventory = e instanceof Error ? e.message : "Inventory update failed";
      }
    }

    // 4) New image (best-effort)
    if (row.shopify_product_id && imageUrl && imageUrl !== row.image_url) {
      try {
        const md = await shopifyAdminGraphQL<any>(PRODUCT_CREATE_MEDIA, {
          productId: row.shopify_product_id,
          media: [{ originalSource: imageUrl, mediaContentType: "IMAGE", alt: title ?? "" }],
        });
        const errs: ShopifyUserError[] = md.productCreateMedia.mediaUserErrors ?? [];
        if (errs.length > 0) warnings.media = errs;
      } catch (e) {
        warnings.media = e instanceof Error ? e.message : "Image attach failed";
      }
    }

    // 5) DB update
    const dbPatch: Record<string, unknown> = {};
    if (title !== undefined) dbPatch.title = title;
    if (descriptionHtml !== undefined) dbPatch.description = descriptionHtml;
    if (price !== undefined) dbPatch.price = price;
    if (category !== undefined) dbPatch.category = category;
    if (stockQuantity !== undefined) dbPatch.stock_quantity = stockQuantity;
    if (imageUrl !== undefined && imageUrl !== null) dbPatch.image_url = imageUrl;

    if (Object.keys(dbPatch).length > 0) {
      const { error: updErr } = await supaAdmin
        .from("coach_products")
        .update(dbPatch)
        .eq("id", productId)
        .eq("coach_id", userId);
      if (updErr) return jsonResponse({ error: `DB update failed: ${updErr.message}` }, 500);
    }

    return jsonResponse({ success: true, ...(Object.keys(warnings).length ? { warnings } : {}) });
  } catch (err) {
    const e = err as ShopifyAdminError;
    if (e.status) return mapShopifyError(e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

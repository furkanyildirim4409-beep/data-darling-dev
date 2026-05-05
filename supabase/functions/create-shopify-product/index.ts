// Edge function: create-shopify-product
// Bridges Coach OS → Shopify Admin API to create a product, set price, and attach an image.
// Auth: in-code JWT validation. Requires 'coach' or 'admin' role.
// Admin token: auto-minted via Dev Dashboard client_credentials grant (see _shared/shopify-admin.ts).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://esm.sh/zod@3.23.8";
import { shopifyAdminGraphQL, type ShopifyAdminError } from "../_shared/shopify-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z
  .object({
    title: z.string().min(2).max(255),
    descriptionHtml: z.string().max(50_000).optional(),
    price: z.number().positive(),
    imageUrl: z.string().url(),
    category: z.string().max(255).optional(),
    vendorName: z.string().max(255).optional(),
    productType: z.enum(["physical", "digital"]).default("physical"),
    trackInventory: z.boolean().default(false),
    stockQuantity: z.number().int().min(0).max(1_000_000).nullable().optional(),
    /** Shopify Taxonomy GID (e.g. gid://shopify/TaxonomyCategory/sg-4-17-2-17) */
    shopifyCategoryId: z
      .string()
      .regex(/^gid:\/\/shopify\/TaxonomyCategory\/[A-Za-z0-9-]+$/)
      .nullable()
      .optional(),
  })
  .superRefine((val, ctx) => {
    if (val.productType === "physical") {
      if (val.stockQuantity === null || val.stockQuantity === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stockQuantity"],
          message: "Fiziksel ürünler için stok adedi zorunludur.",
        });
      }
    }
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

const PRODUCT_CREATE = `
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        handle
        category { id name fullName }
        variants(first: 1) {
          nodes {
            id
            inventoryItem { id }
          }
        }
      }
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

const LOCATIONS_QUERY = `
  query primaryLocation {
    locations(first: 1) {
      nodes { id }
    }
  }`;

const INVENTORY_SET_QUANTITIES = `
  mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      userErrors { field message code }
    }
  }`;

const PUBLICATIONS_QUERY = `
  query publications {
    publications(first: 25) {
      nodes { id name }
    }
  }`;

const PUBLISHABLE_PUBLISH = `
  mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
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
          "Shopify yetkisi eksik. Dev Dashboard → App → Configuration üzerinden write_products, write_inventory ve write_publications scope'larını aktif edin.",
        requiredAccess: err.requiredAccess ?? "write_products write_inventory write_publications",
        tokenSource: "client_credentials grant (auto)",
        shopifyMessage: msg,
        helpUrl: "https://dev.shopify.com/dashboard",
      },
      403,
    );
  }
  if (err.status === 401) {
    return jsonResponse(
      {
        error: "UNAUTHORIZED",
        code: "UNAUTHORIZED",
        message: "Shopify Admin token geçersiz. SHOPIFY_CLIENT_ID/SHOPIFY_CLIENT_SECRET'i kontrol edin.",
        shopifyMessage: msg,
      },
      401,
    );
  }
  return jsonResponse({ error: msg || "Shopify Admin hatası", status: err.status ?? 500 }, 502);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // ---- Auth ----
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  const token = authHeader.replace("Bearer ", "");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supaUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: claimsData, error: claimsErr } = await supaUser.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  const userId = claimsData.claims.sub as string;

  // ---- Authorization (coach or admin) ----
  const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const [{ data: isCoach }, { data: isAdmin }] = await Promise.all([
    supaAdmin.rpc("has_role", { _user_id: userId, _role: "coach" }),
    supaAdmin.rpc("has_role", { _user_id: userId, _role: "admin" }),
  ]);
  if (!isCoach && !isAdmin) {
    return jsonResponse({ error: "Forbidden: coach or admin role required" }, 403);
  }

  // ---- Validate input ----
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      400,
    );
  }
  const {
    title,
    descriptionHtml,
    price,
    imageUrl,
    category,
    vendorName,
    productType,
    trackInventory: trackInventoryRaw,
    stockQuantity,
    shopifyCategoryId,
  } = parsed.data;

  const isDigital = productType === "digital";
  // Physical products always track inventory; digital never do.
  const trackInventory = isDigital ? false : true;
  const warnings: Record<string, unknown> = {};

  try {
    // 1) productCreate (with real Shopify Taxonomy category if provided)
    const productInput: Record<string, unknown> = {
      title,
      descriptionHtml: descriptionHtml ?? "",
      status: "ACTIVE",
      productType: isDigital ? "Digital" : (category ?? "Physical"),
      vendor: vendorName ?? "",
      tags: [
        `coach:${userId}`,
        `type:${productType}`,
        ...(category ? [`category:${category}`] : []),
      ],
    };
    if (shopifyCategoryId) {
      productInput.category = shopifyCategoryId;
    }

    const createData = await shopifyAdminGraphQL<any>(PRODUCT_CREATE, {
      input: productInput,
    });
    const createErrors: ShopifyUserError[] = createData.productCreate.userErrors ?? [];
    if (createErrors.length > 0) {
      return jsonResponse({ error: "productCreate failed", details: createErrors }, 400);
    }
    const productId: string = createData.productCreate.product.id;
    const variantNode = createData.productCreate.product.variants.nodes?.[0];
    const variantId: string | undefined = variantNode?.id;
    const inventoryItemId: string | undefined = variantNode?.inventoryItem?.id;

    if (!variantId) {
      return jsonResponse({ error: "No default variant returned by Shopify", productId }, 500);
    }

    // 2) productVariantsBulkUpdate – set price, shipping, tracking on default variant
    const priceData = await shopifyAdminGraphQL<any>(VARIANTS_BULK_UPDATE, {
      productId,
      variants: [
        {
          id: variantId,
          price: price.toFixed(2),
          inventoryPolicy: "DENY",
          inventoryItem: {
            tracked: trackInventory,
            requiresShipping: !isDigital,
          },
        },
      ],
    });
    const priceErrors: ShopifyUserError[] = priceData.productVariantsBulkUpdate.userErrors ?? [];
    if (priceErrors.length > 0) {
      return jsonResponse(
        { error: "productVariantsBulkUpdate failed", details: priceErrors, productId, variantId },
        400,
      );
    }

    // 3) Set inventory quantity (only when tracked + qty provided)
    if (trackInventory && stockQuantity !== null && stockQuantity !== undefined && inventoryItemId) {
      try {
        const locData = await shopifyAdminGraphQL<any>(LOCATIONS_QUERY, {});
        const locationId: string | undefined = locData?.locations?.nodes?.[0]?.id;
        if (locationId) {
          const invData = await shopifyAdminGraphQL<any>(INVENTORY_SET_QUANTITIES, {
            input: {
              name: "available",
              reason: "correction",
              ignoreCompareQuantity: true,
              quantities: [
                {
                  inventoryItemId,
                  locationId,
                  quantity: stockQuantity,
                },
              ],
            },
          });
          const invErrors: ShopifyUserError[] =
            invData?.inventorySetQuantities?.userErrors ?? [];
          if (invErrors.length > 0) warnings.inventory = invErrors;
        } else {
          warnings.inventory = "No location found";
        }
      } catch (invErr) {
        warnings.inventory = invErr instanceof Error ? invErr.message : "Inventory update failed";
      }
    }

    // 4) Publish to all sales channels (publications)
    try {
      const pubData = await shopifyAdminGraphQL<any>(PUBLICATIONS_QUERY, {});
      const pubs: Array<{ id: string }> = pubData?.publications?.nodes ?? [];
      if (pubs.length > 0) {
        const publishData = await shopifyAdminGraphQL<any>(PUBLISHABLE_PUBLISH, {
          id: productId,
          input: pubs.map((p) => ({ publicationId: p.id })),
        });
        const pubErrors: ShopifyUserError[] =
          publishData?.publishablePublish?.userErrors ?? [];
        if (pubErrors.length > 0) warnings.publications = pubErrors;
      }
    } catch (pubErr) {
      warnings.publications = pubErr instanceof Error ? pubErr.message : "Publish failed";
    }

    // 5) productCreateMedia – attach image (best-effort)
    try {
      const mediaData = await shopifyAdminGraphQL<any>(PRODUCT_CREATE_MEDIA, {
        productId,
        media: [
          {
            originalSource: imageUrl,
            mediaContentType: "IMAGE",
            alt: title,
          },
        ],
      });
      const mediaErrors: ShopifyUserError[] = mediaData.productCreateMedia.mediaUserErrors ?? [];
      if (mediaErrors.length > 0) warnings.media = mediaErrors;
    } catch (mediaErr) {
      warnings.media = mediaErr instanceof Error ? mediaErr.message : "Image attach failed";
    }

    return jsonResponse(
      {
        success: true,
        productId,
        variantId,
        ...(Object.keys(warnings).length > 0 ? { warnings } : {}),
      },
      200,
    );
  } catch (err) {
    const e = err as ShopifyAdminError;
    if (e.status) return mapShopifyError(e);
    return jsonResponse(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500,
    );
  }
});

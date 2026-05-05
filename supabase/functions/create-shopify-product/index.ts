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

const BodySchema = z.object({
  title: z.string().min(2).max(255),
  descriptionHtml: z.string().max(50_000).optional(),
  price: z.number().positive(),
  imageUrl: z.string().url(),
  category: z.string().max(255).optional(),
  vendorName: z.string().max(255).optional(),
  stock: z.number().int().min(0).optional(),
  productKind: z.enum(["physical", "digital"]).optional(),
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
        variants(first: 1) { nodes { id } }
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

const PRIMARY_LOCATION = `
  query PrimaryLocation {
    locations(first: 1) { nodes { id } }
  }`;

const INVENTORY_ADJUST = `
  mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      inventoryAdjustmentGroup { id }
      userErrors { field message }
    }
  }`;

const COLLECTION_BY_HANDLE = `
  query collectionByHandle($query: String!) {
    collections(first: 1, query: $query) { nodes { id handle title } }
  }`;

const COLLECTION_CREATE = `
  mutation collectionCreate($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection { id handle title }
      userErrors { field message }
    }
  }`;

const COLLECTION_ADD_PRODUCTS = `
  mutation collectionAddProducts($id: ID!, $productIds: [ID!]!) {
    collectionAddProducts(id: $id, productIds: $productIds) {
      collection { id }
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

function mapShopifyError(err: ShopifyAdminError) {
  const msg = err.message ?? "";
  if (err.status === 403 || /access denied|required access/i.test(msg)) {
    return jsonResponse(
      {
        error: "ACCESS_DENIED",
        code: "ACCESS_DENIED",
        message:
          "Shopify ürün oluşturma yetkisi eksik. Dev Dashboard → App → Configuration üzerinden write_products (ve gerekirse write_files, write_inventory) scope'larını aktif edin.",
        requiredAccess: err.requiredAccess ?? "write_products",
        tokenSource: err.tokenSource ?? "unknown",
        attemptedTokenSources: err.attemptedTokenSources ?? [],
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

function toHandle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "kategori";
}

function userErrorMessage(prefix: string, errors: ShopifyUserError[]) {
  return `${prefix}: ${errors.map((e) => e.message).join(", ")}`;
}

async function ensureCategoryCollection(category: string) {
  const handle = toHandle(category);
  const found = await shopifyAdminGraphQL<any>(COLLECTION_BY_HANDLE, {
    query: `handle:${handle}`,
  });
  const existing = found.collections?.nodes?.find((node: any) => node.handle === handle);
  if (existing?.id) return existing.id as string;

  const created = await shopifyAdminGraphQL<any>(COLLECTION_CREATE, {
    input: { title: category, handle },
  });
  const errors: ShopifyUserError[] = created.collectionCreate.userErrors ?? [];
  if (errors.length > 0) throw new Error(userErrorMessage("collectionCreate failed", errors));
  return created.collectionCreate.collection.id as string;
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
  const { title, descriptionHtml, price, imageUrl, category, vendorName, stock, productKind } = parsed.data;
  const isDigital = productKind === "digital";

  try {
    // 1) productCreate
    const createData = await shopifyAdminGraphQL<any>(PRODUCT_CREATE, {
      input: {
        title,
        descriptionHtml: descriptionHtml ?? "",
        status: "ACTIVE",
        productType: category ?? "",
        vendor: vendorName ?? "",
        tags: [
          `coach:${userId}`,
          ...(category ? [`category:${category}`] : []),
          isDigital ? "digital" : "physical",
        ],
      },
    });
    const createErrors: ShopifyUserError[] = createData.productCreate.userErrors ?? [];
    if (createErrors.length > 0) {
      return jsonResponse({ error: "productCreate failed", details: createErrors }, 400);
    }
    const productId: string = createData.productCreate.product.id;
    const variantId: string | undefined =
      createData.productCreate.product.variants.nodes?.[0]?.id;

    if (!variantId) {
      return jsonResponse({ error: "No default variant returned by Shopify", productId }, 500);
    }

    // 2) productVariantsBulkUpdate – set price + inventory tracking + shipping flag
    const priceData = await shopifyAdminGraphQL<any>(VARIANTS_BULK_UPDATE, {
      productId,
      variants: [{
        id: variantId,
        price: price.toFixed(2),
        inventoryItem: {
          tracked: typeof stock === "number",
          requiresShipping: !isDigital,
        },
      }],
    });
    const priceErrors: ShopifyUserError[] = priceData.productVariantsBulkUpdate.userErrors ?? [];
    if (priceErrors.length > 0) {
      return jsonResponse(
        { error: "productVariantsBulkUpdate failed", details: priceErrors, productId, variantId },
        400,
      );
    }

    // 2b) Set inventory on hand if stock provided
    if (typeof stock === "number") {
      try {
        const fetched = await shopifyAdminGraphQL<any>(
          `query($id: ID!) { productVariant(id: $id) { inventoryItem { id } } }`,
          { id: variantId },
        );
        const invItemId = fetched.productVariant?.inventoryItem?.id;
        const loc = await shopifyAdminGraphQL<any>(PRIMARY_LOCATION, {});
        const locationId = loc.locations?.nodes?.[0]?.id;
        if (invItemId && locationId) {
          await shopifyAdminGraphQL<any>(INVENTORY_ADJUST, {
            input: {
              reason: "correction",
              setQuantities: [
                { inventoryItemId: invItemId, locationId, quantity: stock },
              ],
            },
          });
        }
      } catch (invErr) {
        console.error("Inventory set failed:", invErr);
      }
    }

    // 3) productCreateMedia – attach image (best-effort)
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
      if (mediaErrors.length > 0) {
        return jsonResponse(
          {
            success: true,
            productId,
            variantId,
            warning: "Image attach failed",
            mediaErrors,
          },
          200,
        );
      }
    } catch (mediaErr) {
      return jsonResponse(
        {
          success: true,
          productId,
          variantId,
          warning: mediaErr instanceof Error ? mediaErr.message : "Image attach failed",
        },
        200,
      );
    }

    return jsonResponse({ success: true, productId, variantId }, 200);
  } catch (err) {
    const e = err as ShopifyAdminError;
    if (e.status) return mapShopifyError(e);
    return jsonResponse(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500,
    );
  }
});

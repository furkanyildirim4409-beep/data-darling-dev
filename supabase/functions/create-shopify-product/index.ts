import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SHOPIFY_API_VERSION = "2025-07";

interface Payload {
  title: string;
  descriptionHtml?: string;
  price: number;
  imageUrl: string;
  category?: string;
  vendorName?: string;
}

async function shopifyGraphql(
  adminUrl: string,
  token: string,
  query: string,
  variables: Record<string, unknown>,
) {
  const res = await fetch(adminUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
}

function extractAccessDenied(errors: any[]): { denied: boolean; requiredAccess?: string; message?: string } {
  if (!Array.isArray(errors)) return { denied: false };
  for (const e of errors) {
    if (e?.extensions?.code === "ACCESS_DENIED") {
      return {
        denied: true,
        requiredAccess: e.extensions.requiredAccess,
        message: e.message,
      };
    }
  }
  return { denied: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Payload;
    if (!body.title || !body.price || !body.imageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const SHOPIFY_DOMAIN = Deno.env.get("SHOPIFY_DOMAIN");
    // Prefer Lovable-managed token; fall back to manual admin token if present.
    const SHOPIFY_TOKEN =
      Deno.env.get("SHOPIFY_ACCESS_TOKEN") ??
      Deno.env.get("SHOPIFY_ADMIN_TOKEN");
    const tokenSource = Deno.env.get("SHOPIFY_ACCESS_TOKEN")
      ? "SHOPIFY_ACCESS_TOKEN (Lovable-managed)"
      : Deno.env.get("SHOPIFY_ADMIN_TOKEN")
      ? "SHOPIFY_ADMIN_TOKEN (manual)"
      : "none";

    if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Shopify credentials not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const adminUrl =
      `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

    console.log("create-shopify-product: calling", {
      domain: SHOPIFY_DOMAIN,
      tokenSource,
      apiVersion: SHOPIFY_API_VERSION,
    });

    // ─── STEP 1: productCreate ──────────────────────────────────────────────
    const productCreateMutation = `
      mutation productCreate($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            variants(first: 1) { edges { node { id } } }
          }
          userErrors { field message }
        }
      }
    `;

    const input: Record<string, unknown> = {
      title: body.title,
      descriptionHtml: body.descriptionHtml ?? "",
      vendor: body.vendorName ?? "Dynabolic Coach",
      productType: body.category ?? "",
      status: "ACTIVE",
    };

    const createRes = await shopifyGraphql(
      adminUrl,
      SHOPIFY_TOKEN,
      productCreateMutation,
      { input },
    );

    // Check for ACCESS_DENIED specifically — return 403 with actionable detail.
    const accessDenied = extractAccessDenied(createRes.json?.errors ?? []);
    if (accessDenied.denied) {
      console.error("productCreate ACCESS_DENIED", {
        domain: SHOPIFY_DOMAIN,
        tokenSource,
        requiredAccess: accessDenied.requiredAccess,
      });
      return new Response(
        JSON.stringify({
          error: "ACCESS_DENIED",
          code: "ACCESS_DENIED",
          message:
            "Shopify ürün oluşturma yetkisi eksik. write_products scope veya mağaza staff izni gerekiyor.",
          requiredAccess: accessDenied.requiredAccess,
          tokenSource,
          shopifyMessage: accessDenied.message,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!createRes.ok || createRes.json.errors) {
      const msg = createRes.json.errors?.[0]?.message ??
        `Shopify ${createRes.status}`;
      console.error("productCreate HTTP/GraphQL error", {
        domain: SHOPIFY_DOMAIN,
        tokenSource,
        status: createRes.status,
        errors: createRes.json?.errors,
      });
      return new Response(
        JSON.stringify({ error: msg, raw: createRes.json }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const createUserErrors =
      createRes.json.data?.productCreate?.userErrors ?? [];
    if (createUserErrors.length > 0) {
      console.error("productCreate userErrors", createUserErrors);
      return new Response(
        JSON.stringify({
          error: createUserErrors[0].message,
          userErrors: createUserErrors,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const product = createRes.json.data?.productCreate?.product;
    const productId: string | null = product?.id ?? null;
    const variantId: string | null =
      product?.variants?.edges?.[0]?.node?.id ?? null;

    if (!productId) {
      return new Response(
        JSON.stringify({ error: "Shopify productId missing in response" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ─── STEP 2: productVariantsBulkUpdate (price) ──────────────────────────
    let priceWarning: string | null = null;
    if (variantId) {
      const variantsBulkUpdateMutation = `
        mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants { id price }
            userErrors { field message }
          }
        }
      `;
      const priceRes = await shopifyGraphql(
        adminUrl,
        SHOPIFY_TOKEN,
        variantsBulkUpdateMutation,
        {
          productId,
          variants: [{ id: variantId, price: String(body.price) }],
        },
      );
      const priceErrors =
        priceRes.json.data?.productVariantsBulkUpdate?.userErrors ?? [];
      if (!priceRes.ok || priceRes.json.errors) {
        priceWarning = priceRes.json.errors?.[0]?.message ??
          `priceUpdate HTTP ${priceRes.status}`;
        console.error("productVariantsBulkUpdate transport error", {
          status: priceRes.status,
          errors: priceRes.json?.errors,
        });
      } else if (priceErrors.length > 0) {
        priceWarning = priceErrors[0].message;
        console.error("productVariantsBulkUpdate userErrors", priceErrors);
      }
    } else {
      priceWarning = "Default variantId missing — price not set";
      console.error(priceWarning);
    }

    // ─── STEP 3: productCreateMedia ─────────────────────────────────────────
    let mediaWarning: string | null = null;
    const productCreateMediaMutation = `
      mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
        productCreateMedia(productId: $productId, media: $media) {
          media { ... on MediaImage { id } }
          mediaUserErrors { field message }
        }
      }
    `;
    const mediaRes = await shopifyGraphql(
      adminUrl,
      SHOPIFY_TOKEN,
      productCreateMediaMutation,
      {
        productId,
        media: [{
          originalSource: body.imageUrl,
          mediaContentType: "IMAGE",
          alt: body.title,
        }],
      },
    );
    const mediaErrors =
      mediaRes.json.data?.productCreateMedia?.mediaUserErrors ?? [];
    if (!mediaRes.ok || mediaRes.json.errors) {
      mediaWarning = mediaRes.json.errors?.[0]?.message ??
        `mediaCreate HTTP ${mediaRes.status}`;
      console.error("productCreateMedia transport error", {
        status: mediaRes.status,
        errors: mediaRes.json?.errors,
      });
    } else if (mediaErrors.length > 0) {
      mediaWarning = mediaErrors[0].message;
      console.error("productCreateMedia mediaUserErrors", mediaErrors);
    }

    return new Response(
      JSON.stringify({ productId, variantId, priceWarning, mediaWarning, tokenSource }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("create-shopify-product fatal", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

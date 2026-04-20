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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
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
    const SHOPIFY_ADMIN_TOKEN = Deno.env.get("SHOPIFY_ADMIN_TOKEN");
    if (!SHOPIFY_DOMAIN || !SHOPIFY_ADMIN_TOKEN) {
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

    const productCreateMutation = `
      mutation productCreate($input: ProductInput!, $media: [CreateMediaInput!]) {
        productCreate(input: $input, media: $media) {
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
      variants: [{ price: String(body.price) }],
    };
    const media = body.imageUrl
      ? [{
        originalSource: body.imageUrl,
        mediaContentType: "IMAGE",
        alt: body.title,
      }]
      : [];

    const shopifyRes = await fetch(adminUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
      },
      body: JSON.stringify({
        query: productCreateMutation,
        variables: { input, media },
      }),
    });

    const shopifyJson = await shopifyRes.json();

    if (!shopifyRes.ok || shopifyJson.errors) {
      const msg = shopifyJson.errors?.[0]?.message ??
        `Shopify ${shopifyRes.status}`;
      return new Response(JSON.stringify({ error: msg, raw: shopifyJson }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userErrors = shopifyJson.data?.productCreate?.userErrors ?? [];
    if (userErrors.length > 0) {
      return new Response(
        JSON.stringify({ error: userErrors[0].message, userErrors }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const product = shopifyJson.data?.productCreate?.product;
    const productId = product?.id ?? null;
    const variantId = product?.variants?.edges?.[0]?.node?.id ?? null;

    return new Response(
      JSON.stringify({ productId, variantId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
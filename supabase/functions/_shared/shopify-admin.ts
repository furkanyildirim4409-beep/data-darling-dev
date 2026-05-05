// Shared Shopify Admin client — uses Dev Dashboard client_credentials grant.
// Token is fetched on demand and cached in memory (per edge instance) until ~1min before expiry.

const API_VERSION = "2025-07";

let cachedToken: string | null = null;
let cachedUntil = 0;

function getShopHost(): string {
  const raw = Deno.env.get("SHOPIFY_DOMAIN");
  if (!raw) throw new Error("SHOPIFY_DOMAIN not configured");
  return raw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

export function invalidateShopifyAdminToken() {
  cachedToken = null;
  cachedUntil = 0;
}

export async function getShopifyAdminToken(forceRefresh = false): Promise<string> {
  // Prefer a long-lived admin access token if provided — avoids the Cloudflare-protected
  // OAuth token endpoint that intermittently returns 403 challenges from edge runtimes.
  const directToken =
    Deno.env.get("SHOPIFY_ADMIN_TOKEN") ?? Deno.env.get("SHOPIFY_ACCESS_TOKEN");
  if (directToken && !forceRefresh) {
    return directToken;
  }

  if (!forceRefresh && cachedToken && Date.now() < cachedUntil - 60_000) {
    return cachedToken;
  }

  const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET not configured");
  }

  const host = getShopHost();
  const res = await fetch(`https://${host}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Shopify token request failed (${res.status}): ${text}`);
  }

  let parsed: { access_token?: string; expires_in?: number };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Shopify token response not JSON: ${text}`);
  }

  if (!parsed.access_token) {
    throw new Error(`Shopify token response missing access_token: ${text}`);
  }

  cachedToken = parsed.access_token;
  cachedUntil = Date.now() + (parsed.expires_in ?? 86_400) * 1000;
  return cachedToken;
}

export interface ShopifyAdminError extends Error {
  status?: number;
  shopifyMessage?: string;
  requiredAccess?: string;
}

async function rawAdminGraphQL(token: string, query: string, variables: Record<string, unknown>) {
  const host = getShopHost();
  const res = await fetch(`https://${host}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  return { res, json };
}

export async function shopifyAdminGraphQL<T = any>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  let token = await getShopifyAdminToken();
  let { res, json } = await rawAdminGraphQL(token, query, variables);

  // 401 → refresh once
  if (res.status === 401) {
    token = await getShopifyAdminToken(true);
    ({ res, json } = await rawAdminGraphQL(token, query, variables));
  }

  if (!res.ok || json?.errors) {
    const firstErr = json?.errors?.[0];
    const err: ShopifyAdminError = new Error(
      firstErr?.message ?? `Shopify Admin API ${res.status}`,
    );
    err.status = res.status;
    err.shopifyMessage = firstErr?.message;
    err.requiredAccess = firstErr?.extensions?.requiredAccess;
    throw err;
  }

  return json.data as T;
}

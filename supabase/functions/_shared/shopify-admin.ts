// Shared Shopify Admin client.
// Shopify Admin GraphQL must use X-Shopify-Access-Token; never Authorization: Bearer.

const API_VERSION = "2025-07";

type TokenCandidate = {
  token: string;
  source: string;
  refreshable: boolean;
};

let cachedToken: string | null = null;
let cachedUntil = 0;

function getShopHost(): string {
  const raw = Deno.env.get("SHOPIFY_DOMAIN");
  if (!raw) throw new Error("SHOPIFY_DOMAIN not configured");
  const cleaned = raw.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const adminStoreMatch = cleaned.match(/^admin\.shopify\.com\/store\/([^/?#]+)/i);

  // `admin.shopify.com/store/<handle>` is a browser/admin UI URL protected by
  // Cloudflare. Admin API calls must go to the shop's permanent domain instead.
  if (adminStoreMatch?.[1]) {
    return `${adminStoreMatch[1]}.myshopify.com`;
  }

  return cleaned.split("/")[0];
}

function directTokenCandidates(): TokenCandidate[] {
  const env = Deno.env.toObject();
  const candidates: TokenCandidate[] = [];
  const seen = new Set<string>();

  const add = (token: string | undefined, source: string) => {
    const trimmed = token?.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    candidates.push({ token: trimmed, source, refreshable: false });
  };

  add(env.SHOPIFY_ADMIN_TOKEN, "SHOPIFY_ADMIN_TOKEN");
  add(env.SHOPIFY_ACCESS_TOKEN, "SHOPIFY_ACCESS_TOKEN");

  Object.keys(env)
    .filter((key) => key.startsWith("SHOPIFY_ONLINE_ACCESS_TOKEN:"))
    .sort()
    .forEach((key) => add(env[key], key));

  return candidates;
}

export function invalidateShopifyAdminToken() {
  cachedToken = null;
  cachedUntil = 0;
}

async function getClientCredentialsToken(forceRefresh = false): Promise<TokenCandidate> {
  if (!forceRefresh && cachedToken && Date.now() < cachedUntil - 60_000) {
    return { token: cachedToken, source: "client_credentials grant", refreshable: true };
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
  return { token: cachedToken, source: "client_credentials grant", refreshable: true };
}

async function tokenCandidates(): Promise<TokenCandidate[]> {
  const direct = directTokenCandidates();
  if (direct.length > 0) return direct;
  return [await getClientCredentialsToken(false)];
}

export async function getShopifyAdminToken(forceRefresh = false): Promise<string> {
  const direct = directTokenCandidates()[0];
  if (direct) return direct.token;
  return (await getClientCredentialsToken(forceRefresh)).token;
}

export interface ShopifyAdminError extends Error {
  status?: number;
  shopifyMessage?: string;
  requiredAccess?: string;
  tokenSource?: string;
  attemptedTokenSources?: string[];
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

function buildAdminError(res: Response, json: any, source: string, attempted: string[]): ShopifyAdminError {
  const firstErr = json?.errors?.[0];
  const err: ShopifyAdminError = new Error(
    firstErr?.message ?? json?._raw ?? `Shopify Admin API ${res.status}`,
  );
  err.status = res.status;
  err.shopifyMessage = firstErr?.message;
  err.requiredAccess = firstErr?.extensions?.requiredAccess;
  err.tokenSource = source;
  err.attemptedTokenSources = attempted;
  return err;
}

function isAuthOrAccessFailure(res: Response, json: any) {
  const firstErr = json?.errors?.[0];
  return (
    res.status === 401 ||
    res.status === 403 ||
    firstErr?.extensions?.code === "ACCESS_DENIED" ||
    Boolean(firstErr?.extensions?.requiredAccess)
  );
}

export async function shopifyAdminGraphQL<T = any>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const candidates = await tokenCandidates();
  const attempted: string[] = [];
  let lastErr: ShopifyAdminError | null = null;

  for (const candidate of candidates) {
    attempted.push(candidate.source);
    let { res, json } = await rawAdminGraphQL(candidate.token, query, variables);

    if (res.status === 401 && candidate.refreshable) {
      const refreshed = await getClientCredentialsToken(true);
      attempted.push(`${refreshed.source}:refresh`);
      ({ res, json } = await rawAdminGraphQL(refreshed.token, query, variables));
    }

    if (res.ok && !json?.errors) {
      return json.data as T;
    }

    lastErr = buildAdminError(res, json, candidate.source, attempted);
    if (!isAuthOrAccessFailure(res, json)) break;
  }

  throw lastErr ?? new Error("Shopify Admin request failed");
}

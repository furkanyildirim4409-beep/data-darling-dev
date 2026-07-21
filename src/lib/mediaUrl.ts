import { supabase } from "@/integrations/supabase/client";

const DEFAULT_TTL = 60 * 60; // 1h

export function isHttpUrl(v?: string | null): boolean {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}

/** Resolve a bare storage path to a signed URL. Pass-through for http(s). */
export async function resolveMediaUrl(
  value?: string | null,
  bucket: string = "chat-media",
  ttl: number = DEFAULT_TTL,
): Promise<string | null> {
  if (!value) return null;
  if (isHttpUrl(value)) return value;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(value, ttl);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Batch-resolve `media_url` on a list of chat message rows. */
export async function resolveChatMessagesMedia<T extends { media_url?: string | null }>(
  messages: T[],
  bucket: string = "chat-media",
  ttl: number = DEFAULT_TTL,
): Promise<T[]> {
  if (!messages.length) return messages;
  const pathIdx: number[] = [];
  const paths: string[] = [];
  messages.forEach((m, i) => {
    if (m.media_url && !isHttpUrl(m.media_url)) {
      pathIdx.push(i);
      paths.push(m.media_url);
    }
  });
  if (!paths.length) return messages;

  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, ttl);
  if (!data) return messages;

  const out = messages.slice();
  data.forEach((res, k) => {
    const i = pathIdx[k];
    if (res?.signedUrl) {
      out[i] = { ...out[i], media_url: res.signedUrl };
    }
  });
  return out;
}

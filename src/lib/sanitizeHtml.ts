import DOMPurify from "dompurify";

/**
 * Shared strict sanitization config for user-authored rich HTML
 * (coaching package descriptions, coach contract templates, etc.).
 * Applied BEFORE persisting to the DB — defense in depth for any
 * consumer that renders the value without its own sanitization
 * (e.g. mobile app, future web surfaces).
 */
const RICH_HTML_CONFIG = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ["style", "script", "form", "iframe", "object", "embed"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
} as const;

export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return "";
  const trimmed = String(html).trim();
  if (!trimmed) return "";
  return DOMPurify.sanitize(trimmed, { ...RICH_HTML_CONFIG, RETURN_TRUSTED_TYPE: false } as any) as string;
}

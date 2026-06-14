# SaaS Pricing UI + Coach Subscription Checkout (Part 4/4)

## 1. Subscription Tier Catalog — `src/lib/subscriptionTiers.ts` (new)

Single source of truth for the 3 tiers. Used by the UI now and by the webhook later.

```ts
export type TierId = "starter" | "pro" | "elite";

export interface Tier {
  id: TierId;
  name: string;           // Başlangıç | Profesyonel | Kurumsal
  tagline: string;
  priceMonthly: number;   // TRY
  highlight?: boolean;    // Pro
  badge?: string;         // "En Popüler" / "Kurumsal"
  features: { label: string; included: boolean }[];
  cta: string;            // "Planı Yükselt / Satın Al"
}
```

Tiers grounded in actual app modules:
- **Starter** — Sporcu yönetimi (50 limit), Program & diyet atama, Temel raporlar, Mesajlaşma. *Kapalı:* AI Asistanı, Mağaza, Akademi, İçerik Stüdyosu, Takım, Beyaz etiket.
- **Pro** — Sınırsız sporcu, AI Program Architect, Global Mağaza, Akademi Stüdyosu, İçerik Stüdyosu, Sosyal & Hikayeler, Otomasyonlar.
- **Elite** — Pro'daki her şey + Alt koç (Takım) yönetimi & granular ACL, Beyaz etiket (gym_name & marka), Gelişmiş finansal analitik, Mailbox & domain, Öncelikli destek.

## 2. Pricing UI — `src/pages/Settings.tsx` (Abonelik tab)

Replace the existing `subscriptionPlans` array + grid (lines ~28-47 and ~490-542) with a polished Stripe-style 3-column card grid:

- Mid card (Pro) elevated with `border-primary`, glow shadow, "En Popüler" ribbon
- Each card: tier name, tagline, big `₺X /ay` price, full feature list with green check icons for included and muted strike-through `XCircle` for excluded
- Primary CTA: **"Planı Yükselt / Satın Al"** → calls `handlePurchaseTier(tier.id)`
- If `profile.subscription_tier` matches current tier → button becomes disabled "Aktif Plan" with success badge
- New handler `handlePurchaseTier(tierId)` invokes the edge function below, redirects to `data.url`, with `Loader2` spinner state per-card and sonner error toast on failure

Keep the existing IBAN/banka block below — it's unrelated.

## 3. Edge Function — `supabase/functions/create-coach-subscription/index.ts` (new)

Mirrors the structure of `create-custom-checkout` (Zod, getClaims auth, BYOK `STRIPE_SECRET_KEY`).

```text
POST { tierId: "starter" | "pro" | "elite" }
  → auth via getClaims (Bearer JWT)
  → map tierId → Stripe Price ID from env:
        STRIPE_PRICE_STARTER, STRIPE_PRICE_PRO, STRIPE_PRICE_ELITE
  → stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price, quantity: 1 }],
        customer_email: userEmail,
        client_reference_id: userId,
        success_url: `${origin}/settings?subscription=success&tier=${tierId}`,
        cancel_url:  `${origin}/settings?subscription=cancelled`,
        metadata: { coach_id: userId, requested_tier: tierId },
        subscription_data: { metadata: { coach_id: userId, requested_tier: tierId } },
      })
  → return { url }
```

CORS, OPTIONS handler, structured errors (400 invalid tier, 401 unauthorized, 500 if any price ID missing). Reads `origin` from `req.headers.get("origin")` with fallback.

Function is deployed automatically. Default `verify_jwt = false`; auth enforced in code via `getClaims`.

## 4. Secrets needed

`STRIPE_SECRET_KEY` already set. Three new runtime secrets required before going live:
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_ELITE`

I'll request them via `add_secret` right after enabling, so the function returns a clean "tier not configured" 500 until they're filled in. The user creates 3 recurring Prices in their Stripe dashboard (TRY, monthly) and pastes the `price_…` IDs.

## 5. Out of scope (for a later part)

- Webhook (`stripe-webhook`) that listens to `checkout.session.completed` / `customer.subscription.updated` and flips `profiles.subscription_tier` based on `metadata.requested_tier`.
- DB-side limit enforcement (50-athlete cap, module gating). UI today reads `profile.subscription_tier` only to highlight the current card.

## Files

- **New:** `src/lib/subscriptionTiers.ts`, `supabase/functions/create-coach-subscription/index.ts`
- **Edited:** `src/pages/Settings.tsx` (tier array removed, pricing grid + `handlePurchaseTier` rewritten)

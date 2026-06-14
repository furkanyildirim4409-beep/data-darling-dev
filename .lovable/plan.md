# Settings Cleanup, WhatsApp Toggle & Dynamic Brand Identity (Part 2/4)

## 1. Database Prep

Migration adds one nullable boolean and extends the self-update RPC.

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled boolean NOT NULL DEFAULT false;
```

Extend `public.update_own_profile(...)` with a new `_whatsapp_notifications_enabled boolean DEFAULT NULL` parameter and a `COALESCE` write, keeping the whitelist contract from `mem://security/profile-updates` intact. No RLS changes.

## 2. `src/pages/Settings.tsx` — Pruning + WhatsApp toggle

### Remove Biography
Delete the entire "Biyografi" textarea block (lines ~491-499) inside the Profile tab. Remove `bio` from `formData` state, the `useEffect` sync, and from the `update_own_profile` payload. The Content Studio remains the sole owner of bios.

### Vaporize Export Data
- Remove `{ id: "data", label: "Veri & Dışa Aktar", icon: Database }` from `settingsSections`.
- Delete the entire `activeSection === "data"` block (lines ~874-904).
- Delete the now-unused `handleExportData`, `isExporting` state, and the `Download` / `Database` icon imports.

### WhatsApp Notification Toggle (Notifications tab)
Add a fourth row inside the `[...].map(...)` notifications list with a Beta chip:

```tsx
<div className="flex items-center justify-between py-2 border-t border-border/40 pt-4">
  <div className="flex items-start gap-3">
    <div className="w-10 h-10 rounded-lg bg-success/10 border border-success/30 flex items-center justify-center">
      <MessageCircle className="w-5 h-5 text-success" />
    </div>
    <div>
      <div className="flex items-center gap-2">
        <p className="font-medium text-foreground">WhatsApp Anlık Bildirimleri</p>
        <span className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30">
          Beta · Yakında
        </span>
      </div>
      <p className="text-sm text-muted-foreground">Sporcu olaylarını WhatsApp üzerinden anında alın.</p>
    </div>
  </div>
  <Switch
    checked={whatsappEnabled}
    onCheckedChange={setWhatsappEnabled}
  />
</div>
```

Wire `whatsappEnabled` state (default from `profile.whatsapp_notifications_enabled`) and include `_whatsapp_notifications_enabled: whatsappEnabled` in the `update_own_profile` RPC call. No third-party integration — the toggle just persists the preference.

## 3. Dynamic Brand Identity

### Save Business Name (already half-wired)
The "İşletme/Salon Adı" input already binds to `formData.gymName` and writes via `_gym_name`. No change needed beyond confirming `refreshProfile()` propagates to the sidebar consumer.

### `useBrandIdentity()` hook (new, `src/hooks/useBrandIdentity.ts`)
Returns the **main coach's** business name regardless of who is logged in:
- If `profile.role === 'coach' && !isSubCoach` → return `profile.gym_name`.
- If `isSubCoach` and `activeCoachId` is set → fetch `profiles.gym_name` where `id = activeCoachId` via a small React Query keyed on `["brand-identity", activeCoachId]` (5min stale). The existing `get_coach_info` SECURITY DEFINER function already exposes `full_name + avatar_url` for any coach id, so we extend its return JSON to also include `gym_name` (single migration), keeping sub-coach visibility safe under RLS.

### `AppSidebar.tsx` — Logo + business subtitle
Replace the current "D" placeholder block (lines 88-100) with:

```tsx
{!collapsed ? (
  <div className="flex flex-col gap-0.5">
    <div className="flex items-center gap-2">
      <img src="/brand-logo.svg" alt="Dynabolic" className="w-7 h-7" />
      <span className="font-bold text-lg tracking-tight text-foreground">DYNABOLIC</span>
    </div>
    {businessName && (
      <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-[0.2em] ml-9">
        {businessName}
      </span>
    )}
  </div>
) : (
  <img src="/brand-logo.svg" alt="Dynabolic" className="w-8 h-8 mx-auto" />
)}
```

### Logo asset
The project currently only ships `favicon.ico`, `pwa-192x192.png`, `pwa-512x512.png`. I will **generate a real Dynabolic mark** as `public/brand-logo.svg` (compact, on-brand neon-lime D-glyph with subtle glow) using `imagegen` (premium tier, transparent background, then copy to `public/`). If the user prefers, they can drop their own PNG/SVG into `public/brand-logo.svg` and the components will pick it up automatically.

### Where else "DYNABOLIC" appears
`TopBar.tsx` and `MobileNav.tsx` also render the wordmark. Same swap (logo + optional subtitle) applied to both for global consistency.

## Files Touched

- **Migration:** add `profiles.whatsapp_notifications_enabled`, extend `update_own_profile` RPC, extend `get_coach_info` RPC to include `gym_name`.
- `src/pages/Settings.tsx` — prune Bio + Export, add WhatsApp Beta toggle, persist new flag.
- `src/hooks/useBrandIdentity.ts` — new hook resolving the head-coach business name.
- `src/components/layout/AppSidebar.tsx` — real logo + business subtitle.
- `src/components/layout/TopBar.tsx` — same logo swap, optional inline subtitle.
- `src/components/layout/MobileNav.tsx` — same logo swap.
- `public/brand-logo.svg` — generated brand mark.

## Open Question

The spec says `/favicon.svg` "or the equivalent real asset path". I plan to generate a fresh `public/brand-logo.svg` Dynabolic mark. If you'd rather upload your own (or have me reuse the existing `/pwa-192x192.png`), say so before I run image generation.

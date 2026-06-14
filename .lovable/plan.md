# 2FA (TOTP) + Dynamic Theme Engine (Part 3/4)

## 1. Dependencies

Add `qrcode.react` (≈4KB, MIT) for rendering the TOTP QR code as an inline `<canvas>`. No backend dependency — Supabase Auth handles TOTP server-side.

```bash
bun add qrcode.react
```

## 2. Theme Engine

### `src/lib/theme.ts` (new)

Single source of truth for primary palettes:

```ts
export const THEME_PALETTES = {
  emerald: { name: "Zümrüt",   hsl: "160 84% 39%", glow: "160 84% 50%" },
  rose:    { name: "Yakut",    hsl: "346 87% 60%", glow: "346 87% 68%" },
  sapphire:{ name: "Safir",    hsl: "217 91% 60%", glow: "217 91% 68%" },
  amber:   { name: "Kehribar", hsl: "38 92% 50%",  glow: "38 92% 60%"  },
  violet:  { name: "Ametist",  hsl: "263 70% 58%", glow: "263 70% 66%" },
  lime:    { name: "Neon Yeşil","hsl": "68 100% 50%", glow: "68 100% 60%" }, // default / legacy
} as const;

export type ThemeKey = keyof typeof THEME_PALETTES;

export const DEFAULT_THEME: ThemeKey = "lime";
const STORAGE_KEY = "dynabolic_theme";

export function applyThemeColor(key: ThemeKey) {
  const palette = THEME_PALETTES[key] ?? THEME_PALETTES[DEFAULT_THEME];
  const root = document.documentElement;
  // Forcefully override Tailwind/shadcn primary tokens
  root.style.setProperty("--primary",         palette.hsl);
  root.style.setProperty("--primary-glow",    palette.glow);
  root.style.setProperty("--sidebar-primary", palette.hsl);
  root.style.setProperty("--ring",            palette.hsl);
  root.style.setProperty("--accent",          palette.hsl);
  localStorage.setItem(STORAGE_KEY, key);
}

export function loadStoredTheme(): ThemeKey {
  const stored = (localStorage.getItem(STORAGE_KEY) as ThemeKey | null) ?? DEFAULT_THEME;
  return (stored in THEME_PALETTES ? stored : DEFAULT_THEME);
}
```

### Apply on boot — `src/main.tsx`

Call `applyThemeColor(loadStoredTheme())` once before `createRoot`, so styles are correct on first paint with no FOUC. No new provider needed.

### Settings → Appearance tab

Replace the `accentColors` array and grid with the 5 premium palettes from `THEME_PALETTES`. The grid renders one swatch per palette; clicking a swatch calls `applyThemeColor(key)` and updates local `selectedColor` state. Initialize `selectedColor` from `loadStoredTheme()` so the active swatch reflects persisted choice. Keep the legacy "Neon Yeşil" so existing users aren't visually downgraded.

## 3. Two-Factor Auth (TOTP) UI — Security tab

### New component `src/components/settings/TwoFactorSetup.tsx`

Self-contained card with three internal states driven by `phase: "idle" | "enrolling" | "verifying" | "active"`. Uses Supabase JS v2 MFA API as per docs.

```text
[idle]      → button "2 Faktörlü Doğrulamayı Etkinleştir"
                on click → supabase.auth.mfa.enroll({ factorType: "totp",
                                                      friendlyName: "Dynabolic" })
                store { factorId, totp.qr_code (SVG data URL),
                        totp.secret, totp.uri } → phase = "enrolling"

[enrolling] → show QR (qrcode.react <QRCodeSVG value={totp.uri} size={180} />),
              fallback "Manuel Anahtar" text (totp.secret),
              6-digit InputOTP, "Doğrula" button
                on click → supabase.auth.mfa.challenge({ factorId })
                           then  supabase.auth.mfa.verify({ factorId, challengeId, code })
                success → toast.success + phase = "active" + refreshFactors()
                error   → toast.error("Kod hatalı veya süresi dolmuş.") + clear input

[active]    → green badge "Aktif", "Devre Dışı Bırak" destructive button
                on click → supabase.auth.mfa.unenroll({ factorId })
                           → phase = "idle"
```

Initial mount calls `supabase.auth.mfa.listFactors()`; if any `totp.status === "verified"` exists, jump straight to `active` and remember its `factorId`. All Supabase calls wrapped in try/catch with sonner toasts (`toast.success` / `toast.error`).

### Wiring into Settings

In the existing Security tab, render `<TwoFactorSetup />` above the password-change card under a section heading "İki Faktörlü Doğrulama (2FA)". No changes to password block.

## 4. Files Touched

- **New:** `src/lib/theme.ts`, `src/components/settings/TwoFactorSetup.tsx`
- **Edited:** `src/main.tsx` (boot-time theme apply), `src/pages/Settings.tsx` (5-palette grid + `<TwoFactorSetup />` in Security tab)
- **Package:** add `qrcode.react`

## Notes

- Supabase project already has Auth enabled; TOTP MFA is built-in and does not require any DB migration or edge function.
- Theme variables `--primary-glow`, `--ring`, `--accent` are overridden in addition to `--primary` so derived shadcn variants (focus rings, accent badges, glow effects) shift consistently. Existing `index.css` keeps the lime defaults as fallback, so users who never picked a theme see the current look.
- No security memory update needed — MFA hardens auth without changing what's public.

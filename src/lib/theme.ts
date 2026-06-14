export const THEME_PALETTES = {
  lime:     { name: "Neon Yeşil", hsl: "68 100% 50%", glow: "68 100% 60%" },
  emerald:  { name: "Zümrüt",     hsl: "160 84% 39%", glow: "160 84% 50%" },
  rose:     { name: "Yakut",      hsl: "346 87% 60%", glow: "346 87% 68%" },
  sapphire: { name: "Safir",      hsl: "217 91% 60%", glow: "217 91% 68%" },
  amber:    { name: "Kehribar",   hsl: "38 92% 50%",  glow: "38 92% 60%"  },
  violet:   { name: "Ametist",    hsl: "263 70% 58%", glow: "263 70% 66%" },
} as const;

export type ThemeKey = keyof typeof THEME_PALETTES;

export const DEFAULT_THEME: ThemeKey = "lime";
const STORAGE_KEY = "dynabolic_theme";

export function applyThemeColor(key: ThemeKey) {
  const palette = THEME_PALETTES[key] ?? THEME_PALETTES[DEFAULT_THEME];
  const root = document.documentElement;
  root.style.setProperty("--primary", palette.hsl);
  root.style.setProperty("--primary-glow", palette.glow);
  root.style.setProperty("--sidebar-primary", palette.hsl);
  root.style.setProperty("--ring", palette.hsl);
  root.style.setProperty("--accent", palette.hsl);
  try { localStorage.setItem(STORAGE_KEY, key); } catch {}
}

export function loadStoredTheme(): ThemeKey {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeKey | null;
    if (stored && stored in THEME_PALETTES) return stored;
  } catch {}
  return DEFAULT_THEME;
}

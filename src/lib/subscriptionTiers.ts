export type TierId = "starter" | "pro" | "elite";

export interface TierFeature {
  label: string;
  included: boolean;
}

export interface Tier {
  id: TierId;
  name: string;
  tagline: string;
  priceMonthly: number; // TRY
  highlight?: boolean;
  badge?: string;
  features: TierFeature[];
  cta: string;
}

// NOTE: 'pro' (5000 TL) and 'elite' (3000 TL) IDs were swapped project-wide.
// Internal id 'elite' is now the mid-tier "Elit" (3000 TL); 'pro' is the top tier "Pro" (5000 TL).
export const TIERS: Tier[] = [
  {
    id: "starter",
    name: "Başlangıç",
    tagline: "Tek başına çalışan koçlar için temel altyapı.",
    priceMonthly: 1000,
    cta: "Planı Satın Al",
    features: [
      { label: "50 sporcu limiti", included: true },
      { label: "Program & diyet atama", included: true },
      { label: "Temel raporlar & uyarılar", included: true },
      { label: "Sporcu mesajlaşması", included: true },
      { label: "AI Program Architect", included: false },
      { label: "Global Mağaza & Akademi", included: false },
      { label: "İçerik Stüdyosu & Otomasyonlar", included: false },
      { label: "Takım yönetimi & Beyaz etiket", included: false },
    ],
  },
  {
    id: "elite",
    name: "Elit",
    tagline: "Tek başına ölçekleyen koçlar için tam içerik motoru.",
    priceMonthly: 3000,
    highlight: true,
    badge: "En Popüler",
    cta: "Planı Yükselt",
    features: [
      { label: "Sınırsız sporcu", included: true },
      { label: "AI Program Architect & Aksiyon Motoru", included: true },
      { label: "Global Mağaza (Shopify entegre)", included: true },
      { label: "Akademi Stüdyosu (video kütüphanesi)", included: true },
      { label: "İçerik Stüdyosu & Sosyal Hikayeler", included: true },
      { label: "Otomasyon kuralları & e-posta şablonları", included: true },
      { label: "Alt koç (Takım) yönetimi", included: false },
      { label: "Beyaz etiket & gelişmiş finans", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Ajanslar ve ekipler için tam yönetim katmanı.",
    priceMonthly: 5000,
    badge: "Kurumsal",
    cta: "Planı Satın Al",
    features: [
      { label: "Elit paketteki her şey", included: true },
      { label: "Alt koç (Takım) yönetimi + granüler ACL", included: true },
      { label: "Beyaz etiket (marka adı & logo)", included: true },
      { label: "Gelişmiş finansal analitik & raporlar", included: true },
      { label: "Mailbox & özel domain entegrasyonu", included: true },
      { label: "Öncelikli destek & onboarding", included: true },
      { label: "SLA & özelleştirme talepleri", included: true },
      { label: "Çoklu lokasyon raporlama", included: true },
    ],
  },
];

export const TIER_BY_ID: Record<TierId, Tier> = Object.fromEntries(
  TIERS.map((t) => [t.id, t])
) as Record<TierId, Tier>;

/** Map server-stored `profiles.subscription_tier` string to TierId (case-insensitive). */
export function normalizeTier(raw?: string | null): TierId | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  // Pro (top tier, 5000 TL) — formerly named Profesyonel/Kurumsal
  if (s === "pro" || s.includes("profes") || s.includes("kurum")) return "pro";
  // Elit (mid tier, 3000 TL) — formerly named İleri Seviye/Popüler
  if (s.includes("elit") || s.includes("elite") || s.includes("ileri") || s.includes("popüler") || s.includes("populer")) return "elite";
  if (s.includes("start") || s.includes("başl") || s.includes("basl")) return "starter";
  return null;
}

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

export const TIERS: Tier[] = [
  {
    id: "starter",
    name: "Başlangıç",
    tagline: "Tek başına çalışan koçlar için temel altyapı.",
    priceMonthly: 499,
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
    id: "pro",
    name: "Profesyonel",
    tagline: "Tek başına ölçekleyen koçlar için tam içerik motoru.",
    priceMonthly: 1499,
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
    id: "elite",
    name: "Kurumsal",
    tagline: "Ajanslar ve ekipler için tam yönetim katmanı.",
    priceMonthly: 3499,
    badge: "Kurumsal",
    cta: "Planı Satın Al",
    features: [
      { label: "Profesyonel paketteki her şey", included: true },
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
  if (s.includes("elite") || s.includes("kurum")) return "elite";
  if (s.includes("pro") || s.includes("profes")) return "pro";
  if (s.includes("start") || s.includes("başl") || s.includes("basl")) return "starter";
  return null;
}

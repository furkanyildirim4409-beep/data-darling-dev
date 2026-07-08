import { Crown, Star, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PackageTierBadgeProps {
  level?: string | null;
  className?: string;
}

type Tier = "elite" | "pro" | "standard";

const TIER_CONFIG: Record<Tier, { label: string; className: string; Icon: typeof Crown }> = {
  elite: {
    label: "Elite",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/40",
    Icon: Crown,
  },
  pro: {
    label: "Pro",
    className: "bg-slate-400/15 text-slate-200 border-slate-400/40",
    Icon: Star,
  },
  standard: {
    label: "Standard",
    className: "bg-muted text-muted-foreground border-border",
    Icon: Circle,
  },
};

export function PackageTierBadge({ level, className }: PackageTierBadgeProps) {
  if (!level) return null;
  const key = level.toLowerCase() as Tier;
  const config = TIER_CONFIG[key];
  if (!config) return null;
  const { label, className: tierClass, Icon } = config;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] uppercase tracking-widest font-bold whitespace-nowrap",
        tierClass,
        className,
      )}
      title={`${label} paket seviyesi`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

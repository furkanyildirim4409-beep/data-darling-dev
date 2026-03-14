import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger";
  description?: string;
  onClick?: () => void;
}

const variantStyles = {
  default: "border-border hover:border-primary/30",
  success: "border-success/20 hover:border-success/40",
  warning: "border-warning/20 hover:border-warning/40",
  danger: "border-destructive/20 hover:border-destructive/40",
};

const iconVariantStyles = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
};

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  variant = "default",
  description,
  onClick,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "glass glass-hover rounded-xl p-3 md:p-5 border transition-all",
        variantStyles[variant],
        onClick && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-0.5 md:space-y-1">
          <p className="text-xs md:text-sm text-muted-foreground font-medium line-clamp-1">{title}</p>
          <p className="text-xl md:text-3xl font-bold font-mono tracking-tight text-foreground">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0",
            iconVariantStyles[variant]
          )}
        >
          <Icon className="w-4 h-4 md:w-5 md:h-5" />
        </div>
      </div>

      {change && (
        <div className="mt-2 md:mt-3 flex items-center gap-1 flex-wrap">
          {change.type === "increase" ? (
            <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-success" />
          ) : (
            <TrendingDown className="w-3 h-3 md:w-4 md:h-4 text-destructive" />
          )}
          <span
            className={cn(
              "text-xs md:text-sm font-mono font-medium",
              change.type === "increase" ? "text-success" : "text-destructive"
            )}
          >
            {change.type === "increase" ? "+" : "-"}%{Math.abs(change.value)}
          </span>
          <span className="text-[10px] md:text-xs text-muted-foreground ml-1 hidden sm:inline">geçen haftaya göre</span>
        </div>
      )}

      {description && !change && (
        <p className="mt-1.5 text-[10px] md:text-xs text-muted-foreground font-mono">{description}</p>
      )}
    </div>
  );
}

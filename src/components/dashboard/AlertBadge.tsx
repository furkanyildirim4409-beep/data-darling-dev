import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Info, LucideIcon } from "lucide-react";

interface AlertBadgeProps {
  type: "critical" | "warning" | "info";
  title: string;
  message: string;
  time?: string;
  onClick?: () => void;
}

const alertConfig: Record<
  AlertBadgeProps["type"],
  { icon: LucideIcon; className: string; iconClass: string }
> = {
  critical: {
    icon: AlertCircle,
    className: "border-destructive/30 bg-destructive/5 hover:border-destructive/50",
    iconClass: "text-destructive",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-warning/30 bg-warning/5 hover:border-warning/50",
    iconClass: "text-warning",
  },
  info: {
    icon: Info,
    className: "border-primary/30 bg-primary/5 hover:border-primary/50",
    iconClass: "text-primary",
  },
};

export function AlertBadge({ type, title, message, time, onClick }: AlertBadgeProps) {
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border p-4 transition-all duration-200 cursor-pointer",
        config.className
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
            type === "critical" && "bg-destructive/20 pulse-red"
          )}
        >
          <Icon className={cn("w-4 h-4", config.iconClass)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-foreground text-sm">{title}</h4>
            {time && (
              <span className="text-xs text-muted-foreground font-mono">{time}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
        </div>
      </div>
    </div>
  );
}

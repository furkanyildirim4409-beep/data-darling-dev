import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PresenceIndicatorProps {
  status: "online" | "away" | "busy" | "offline";
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const statusConfig = {
  online: {
    color: "bg-success",
    label: "Çevrimiçi",
    pulse: true,
  },
  away: {
    color: "bg-warning",
    label: "Uzakta",
    pulse: false,
  },
  busy: {
    color: "bg-destructive",
    label: "Meşgul",
    pulse: false,
  },
  offline: {
    color: "bg-muted-foreground",
    label: "Çevrimdışı",
    pulse: false,
  },
};

const sizeConfig = {
  sm: "w-2 h-2",
  md: "w-3 h-3",
  lg: "w-4 h-4",
};

export function PresenceIndicator({ 
  status, 
  showLabel = false, 
  size = "md",
  className 
}: PresenceIndicatorProps) {
  const config = statusConfig[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1.5", className)}>
            <span className="relative flex">
              <span
                className={cn(
                  "rounded-full",
                  sizeConfig[size],
                  config.color,
                  config.pulse && "animate-pulse"
                )}
              />
              {config.pulse && (
                <span
                  className={cn(
                    "absolute inset-0 rounded-full opacity-75 animate-ping",
                    config.color
                  )}
                />
              )}
            </span>
            {showLabel && (
              <span className="text-xs text-muted-foreground">{config.label}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface AthleteCardProps {
  name: string;
  sport: string;
  avatar?: string;
  status: "active" | "recovering" | "at-risk";
  metrics: {
    compliance: number;
    performance: number;
    readiness: number;
  };
  onClick?: () => void;
}

const statusStyles = {
  active: { label: "Active", className: "bg-success/10 text-success border-success/20" },
  recovering: { label: "Recovering", className: "bg-warning/10 text-warning border-warning/20" },
  "at-risk": { label: "At Risk", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export function AthleteCard({
  name,
  sport,
  avatar,
  status,
  metrics,
  onClick,
}: AthleteCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div
      onClick={onClick}
      className={cn(
        "glass glass-hover rounded-xl p-4 border border-border cursor-pointer",
        "flex items-center gap-4 group transition-all duration-200"
      )}
    >
      {/* Avatar */}
      <Avatar className="w-12 h-12 border-2 border-border group-hover:border-primary/30 transition-colors">
        <AvatarImage src={avatar} />
        <AvatarFallback className="bg-primary/20 text-primary font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-foreground truncate">{name}</h4>
          <Badge
            variant="outline"
            className={cn("text-xs border", statusStyles[status].className)}
          >
            {statusStyles[status].label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{sport}</p>
      </div>

      {/* Metrics */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-lg font-bold font-mono text-foreground">
            {metrics.compliance}%
          </p>
          <p className="text-xs text-muted-foreground">Compliance</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold font-mono text-primary">
            {metrics.performance}
          </p>
          <p className="text-xs text-muted-foreground">Performance</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold font-mono text-foreground">
            {metrics.readiness}%
          </p>
          <p className="text-xs text-muted-foreground">Readiness</p>
        </div>
      </div>
    </div>
  );
}

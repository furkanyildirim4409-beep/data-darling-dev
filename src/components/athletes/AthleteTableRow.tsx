import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, User, ChevronRight, MessageCircleWarning } from "lucide-react";
import { Athlete } from "@/data/athletes";

interface AthleteTableRowProps {
  athlete: Athlete;
  onMessage?: (athlete: Athlete) => void;
  onViewProfile?: (athlete: Athlete) => void;
  hasUnanswered?: boolean;
}

const tierStyles = {
  Elite: "bg-primary/10 text-primary border-primary/20",
  Pro: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Standard: "bg-muted text-muted-foreground border-border",
};

const riskLabels = {
  Low: "Düşük",
  Medium: "Orta",
  High: "Yüksek",
};

const riskStyles = {
  Low: "bg-success/10 text-success border-success/20",
  Medium: "bg-warning/10 text-warning border-warning/20",
  High: "bg-destructive/10 text-destructive border-destructive/20 animate-pulse",
};

export function AthleteTableRow({ athlete, onMessage, onViewProfile, hasUnanswered }: AthleteTableRowProps) {
  const navigate = useNavigate();
  
  const initials = athlete.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const getComplianceColor = () => {
    if (athlete.compliance >= 80) return "bg-success";
    if (athlete.compliance >= 60) return "bg-warning";
    return "bg-destructive";
  };

  const getReadinessColor = () => {
    if (athlete.readiness >= 80) return "text-success";
    if (athlete.readiness >= 60) return "text-warning";
    return "text-destructive";
  };

  return (
    <tr
      className={cn(
        "border-b border-border hover:bg-secondary/30 transition-colors group",
        athlete.injuryRisk === "High" && "bg-destructive/5"
      )}
    >
      {/* Student */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border border-border group-hover:border-primary/30 transition-colors">
            <AvatarImage src={athlete.avatar} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{athlete.name}</span>
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", tierStyles[athlete.tier])}>
                {athlete.tier}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">{athlete.sport}</span>
          </div>
        </div>
      </td>

      {/* Compliance */}
      <td className="py-3 px-4">
        <div className="w-32 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Uyum</span>
            <span className={cn("font-mono font-medium", athlete.compliance >= 80 ? "text-success" : athlete.compliance >= 60 ? "text-warning" : "text-destructive")}>
              {athlete.compliance}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", getComplianceColor())}
              style={{ width: `${athlete.compliance}%` }}
            />
          </div>
        </div>
      </td>

      {/* Readiness */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span className={cn("text-xl font-bold font-mono", getReadinessColor())}>
            {athlete.readiness}
          </span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </td>

      {/* Injury Risk */}
      <td className="py-3 px-4">
        <Badge variant="outline" className={cn("font-medium", riskStyles[athlete.injuryRisk])}>
          {riskLabels[athlete.injuryRisk]}
        </Badge>
      </td>

      {/* Last Active */}
      <td className="py-3 px-4">
        <span className={cn(
          "text-sm font-mono",
          athlete.lastActive.includes("day") ? "text-warning" : "text-muted-foreground"
        )}>
          {athlete.lastActive}
        </span>
      </td>

      {/* Actions */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMessage?.(athlete)}
            className="h-8 px-2 text-muted-foreground hover:text-primary relative"
          >
            <MessageSquare className="w-4 h-4" />
            {hasUnanswered && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-warning" />
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/athletes/${athlete.id}`)}
            className="h-8 px-3 text-muted-foreground hover:text-primary"
          >
            <User className="w-4 h-4 mr-1" />
            Görüntüle
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

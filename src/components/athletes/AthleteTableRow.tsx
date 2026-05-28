import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, User, ChevronRight } from "lucide-react";
import { Athlete } from "@/types/shared-models";

interface AthleteTableRowProps {
  athlete: Athlete;
  onMessage?: (athlete: Athlete) => void;
  onViewProfile?: (athlete: Athlete) => void;
  hasUnanswered?: boolean;
}

const riskLabels: Record<Athlete["injuryRisk"], string> = {
  Low: "Düşük",
  Medium: "Orta",
  High: "Yüksek",
  Inactive: "Pasif",
};

const riskStyles: Record<Athlete["injuryRisk"], string> = {
  Low: "bg-success/10 text-success border-success/20",
  Medium: "bg-warning/10 text-warning border-warning/20",
  High: "bg-destructive/10 text-destructive border-destructive/20 animate-pulse",
  Inactive: "bg-muted text-muted-foreground border-border",
};

export function AthleteTableRow({ athlete, onMessage, hasUnanswered }: AthleteTableRowProps) {
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

  const packageLabel = athlete.packageTitle ?? athlete.tier;

  return (
    <tr
      className={cn(
        "border-b border-border hover:bg-secondary/30 transition-colors group",
        athlete.injuryRisk === "High" && "bg-destructive/5"
      )}
    >
      {/* Student */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="w-10 h-10 border border-border group-hover:border-primary/30 transition-colors shrink-0">
            <AvatarImage src={athlete.avatar} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-foreground whitespace-nowrap truncate max-w-[180px]">
                {athlete.name}
              </span>
              <span
                className="border border-primary/20 bg-primary/10 text-primary uppercase text-[10px] tracking-wider rounded-md font-bold px-2 py-0.5 whitespace-nowrap truncate max-w-[160px]"
                title={packageLabel}
              >
                {packageLabel}
              </span>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap truncate block max-w-[220px]">
              {athlete.sport || athlete.email}
            </span>
          </div>
        </div>
      </td>

      {/* Compliance */}
      <td className="py-3 px-4">
        <div className="w-32 space-y-1">
          <div className="flex justify-between text-xs whitespace-nowrap">
            <span className="text-muted-foreground">Uyum</span>
            <span
              className={cn(
                "font-mono font-medium",
                athlete.compliance >= 80
                  ? "text-success"
                  : athlete.compliance >= 60
                  ? "text-warning"
                  : "text-destructive"
              )}
            >
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
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className={cn("text-xl font-bold font-mono", getReadinessColor())}>
            {athlete.readiness}
          </span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </td>

      {/* Injury Risk */}
      <td className="py-3 px-4">
        <Badge
          variant="outline"
          className={cn("font-medium whitespace-nowrap", riskStyles[athlete.injuryRisk])}
        >
          {riskLabels[athlete.injuryRisk]}
        </Badge>
      </td>

      {/* Last Active */}
      <td className="py-3 px-4">
        <span
          className={cn(
            "text-sm font-mono whitespace-nowrap truncate block max-w-[160px]",
            athlete.injuryRisk === "Inactive" ? "text-warning" : "text-muted-foreground"
          )}
          title={athlete.lastActive}
        >
          {athlete.lastActive}
        </span>
      </td>

      {/* Actions */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2 transition-opacity whitespace-nowrap opacity-100">
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

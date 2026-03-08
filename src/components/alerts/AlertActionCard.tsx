import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  LucideIcon,
  Mail,
  User,
  RefreshCw,
  CheckCircle,
  X
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Notification } from "@/types/shared-models";
import { ProgramSelectModal } from "./ProgramSelectModal";

interface AlertActionCardProps {
  alert: Notification;
  onDismiss?: (id: number) => void;
}

type AlertLevel = "critical" | "warning" | "info";

const alertConfig: Record<
  AlertLevel,
  { icon: LucideIcon; className: string; iconClass: string; pulseClass?: string }
> = {
  critical: {
    icon: AlertCircle,
    className: "border-destructive/30 bg-destructive/5 hover:border-destructive/50",
    iconClass: "text-destructive",
    pulseClass: "pulse-red",
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

export function AlertActionCard({ alert, onDismiss }: AlertActionCardProps) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  
  const level = alert.level || "info";
  const config = alertConfig[level];
  const Icon = config.icon;

  const handleRemind = () => {
    toast({
      title: "Hatırlatma Gönderildi",
      description: "Mail başarıyla gönderildi.",
    });
  };

  const handleGoToProfile = () => {
    if (alert.athleteId) {
      navigate(`/athletes/${alert.athleteId}`);
    } else {
      navigate("/athletes");
    }
  };

  const handleRefreshProgram = () => {
    // Extract athlete name from title
    const athleteName = alert.title.split(" - ")[0] || "Sporcu";
    setIsProgramModalOpen(true);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setTimeout(() => {
      onDismiss?.(typeof alert.id === 'number' ? alert.id : parseInt(alert.id as string, 10));
    }, 300);
  };

  const handleMarkResolved = () => {
    toast({
      title: "Çözüldü İşaretlendi",
      description: "Uyarı arşive taşındı.",
    });
    handleDismiss();
  };

  // Get action buttons based on type (category)
  const getActionButtons = () => {
    switch (alert.type) {
      case "payment":
        return (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRemind}
              className="border-warning/30 text-warning hover:bg-warning/10"
            >
              <Mail className="w-3 h-3 mr-1" />
              Hatırlat
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleGoToProfile}
              className="text-muted-foreground hover:text-foreground"
            >
              <User className="w-3 h-3 mr-1" />
              Profile Git
            </Button>
          </>
        );
      case "health":
        return (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGoToProfile}
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <User className="w-3 h-3 mr-1" />
              Profile Git
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleMarkResolved}
              className="text-muted-foreground hover:text-foreground"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Çözüldü
            </Button>
          </>
        );
      case "program":
        return (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshProgram}
              className="border-primary/30 text-primary hover:bg-primary/10"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Programı Yenile
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleGoToProfile}
              className="text-muted-foreground hover:text-foreground"
            >
              <User className="w-3 h-3 mr-1" />
              Profile Git
            </Button>
          </>
        );
      case "checkin":
        return (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRemind}
              className="border-orange-400/30 text-orange-400 hover:bg-orange-400/10"
            >
              <Mail className="w-3 h-3 mr-1" />
              Hatırlat
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleGoToProfile}
              className="text-muted-foreground hover:text-foreground"
            >
              <User className="w-3 h-3 mr-1" />
              Profile Git
            </Button>
          </>
        );
      default:
        return (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleMarkResolved}
            className="text-muted-foreground hover:text-foreground"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Okundu
          </Button>
        );
    }
  };

  const athleteName = alert.title.split(" - ")[0] || "Sporcu";

  if (isDismissed) {
    return null;
  }

  return (
    <>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "rounded-lg border p-4 transition-all duration-200 relative group",
          config.className,
          isDismissed && "opacity-0 scale-95"
        )}
      >
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className={cn(
            "absolute top-2 right-2 p-1 rounded-full transition-opacity",
            "text-muted-foreground hover:text-foreground hover:bg-secondary",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              level === "critical" && "bg-destructive/20",
              level === "warning" && "bg-warning/20",
              level === "info" && "bg-primary/20",
              config.pulseClass
            )}
          >
            <Icon className={cn("w-4 h-4", config.iconClass)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 pr-6">
              <h4 className="font-semibold text-foreground text-sm">{alert.title}</h4>
              <span className="text-xs text-muted-foreground font-mono">{alert.time}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
            
            {/* Action buttons - shown on hover */}
            <div
              className={cn(
                "flex items-center gap-2 mt-3 transition-all duration-200",
                isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
              )}
            >
              {getActionButtons()}
            </div>
          </div>
        </div>
      </div>

      <ProgramSelectModal
        open={isProgramModalOpen}
        onOpenChange={setIsProgramModalOpen}
        athleteName={athleteName}
      />
    </>
  );
}

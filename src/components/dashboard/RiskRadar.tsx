import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AlertTriangle, Shield, ShieldAlert, ShieldCheck, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardAthlete, RiskDistribution, CriticalAthlete } from "@/hooks/useDashboardData";

interface RiskRadarProps {
  athletes: DashboardAthlete[];
  riskDistribution: RiskDistribution;
  criticalAthletes: CriticalAthlete[];
  isLoading: boolean;
}

function classifyRisk(readiness: number | null): "Low" | "Medium" | "High" {
  const score = readiness ?? 75;
  if (score >= 70) return "Low";
  if (score >= 50) return "Medium";
  return "High";
}

interface RiskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  riskLevel: "Low" | "Medium" | "High";
  athletes: DashboardAthlete[];
}

function RiskDialog({ open, onOpenChange, riskLevel, athletes }: RiskDialogProps) {
  const navigate = useNavigate();
  const filtered = athletes.filter((a) => classifyRisk(a.readiness_score) === riskLevel);

  const levelConfig = {
    Low: { label: "Düşük Risk", icon: ShieldCheck, color: "success" },
    Medium: { label: "Orta Risk", icon: Shield, color: "warning" },
    High: { label: "Yüksek Risk", icon: ShieldAlert, color: "destructive" },
  };

  const config = levelConfig[riskLevel];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              config.color === "success" && "bg-success/10",
              config.color === "warning" && "bg-warning/10",
              config.color === "destructive" && "bg-destructive/10"
            )}>
              <Icon className={cn(
                "w-5 h-5",
                config.color === "success" && "text-success",
                config.color === "warning" && "text-warning",
                config.color === "destructive" && "text-destructive"
              )} />
            </div>
            <div>
              <span className="text-foreground">{config.label} Sporcular</span>
              <p className="text-sm font-normal text-muted-foreground">
                {filtered.length} sporcu bu kategoride
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mt-4 max-h-80 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Bu kategoride sporcu yok</p>
          )}
          {filtered.map((athlete) => (
            <div
              key={athlete.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors"
              onClick={() => {
                onOpenChange(false);
                navigate(`/athletes/${athlete.id}`);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">
                    {(athlete.full_name ?? "?").charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{athlete.full_name || "İsimsiz"}</p>
                  <p className="text-xs text-muted-foreground">Hazırlık: {athlete.readiness_score ?? 75}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface RiskGaugeProps {
  riskDistribution: RiskDistribution;
  athletes: DashboardAthlete[];
}

function RiskGauge({ riskDistribution, athletes }: RiskGaugeProps) {
  const [selectedRisk, setSelectedRisk] = useState<"Low" | "Medium" | "High" | null>(null);

  const totalAthletes = riskDistribution.low.count + riskDistribution.medium.count + riskDistribution.high.count;
  const lowPercent = totalAthletes > 0 ? (riskDistribution.low.count / totalAthletes) * 100 : 0;
  const mediumPercent = totalAthletes > 0 ? (riskDistribution.medium.count / totalAthletes) * 100 : 0;
  const highPercent = totalAthletes > 0 ? (riskDistribution.high.count / totalAthletes) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Risk Dağılımı</span>
          <span className="font-mono text-foreground">{totalAthletes} Sporcu</span>
        </div>

        <div className="relative h-8 rounded-lg overflow-hidden bg-secondary/50 flex">
          {totalAthletes === 0 ? (
            <div className="h-full w-full flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Veri yok</span>
            </div>
          ) : (
            <>
              <div
                className="h-full bg-success transition-all duration-500 flex items-center justify-center cursor-pointer hover:brightness-110"
                style={{ width: `${lowPercent}%` }}
                onClick={() => setSelectedRisk("Low")}
              >
                {riskDistribution.low.count > 0 && <span className="text-xs font-bold text-black">{riskDistribution.low.count}</span>}
              </div>
              <div
                className="h-full bg-warning transition-all duration-500 flex items-center justify-center cursor-pointer hover:brightness-110"
                style={{ width: `${mediumPercent}%` }}
                onClick={() => setSelectedRisk("Medium")}
              >
                {riskDistribution.medium.count > 0 && <span className="text-xs font-bold text-black">{riskDistribution.medium.count}</span>}
              </div>
              <div
                className="h-full bg-destructive transition-all duration-500 flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(255,46,46,0.6)] cursor-pointer hover:brightness-110"
                style={{ width: `${highPercent}%` }}
                onClick={() => setSelectedRisk("High")}
              >
                {riskDistribution.high.count > 0 && <span className="text-xs font-bold text-foreground">{riskDistribution.high.count}</span>}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80" onClick={() => setSelectedRisk("Low")}>
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-xs text-muted-foreground">Düşük ({lowPercent.toFixed(0)}%)</span>
            </div>
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80" onClick={() => setSelectedRisk("Medium")}>
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span className="text-xs text-muted-foreground">Orta ({mediumPercent.toFixed(0)}%)</span>
            </div>
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80" onClick={() => setSelectedRisk("High")}>
              <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
              <span className="text-xs text-muted-foreground">Yüksek ({highPercent.toFixed(0)}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Category Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div
          className="p-3 md:p-4 rounded-xl bg-success/10 border border-success/30 cursor-pointer hover:border-success/50 transition-colors"
          onClick={() => setSelectedRisk("Low")}
        >
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-success" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold font-mono text-success">{riskDistribution.low.count}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Düşük Risk</p>
            </div>
          </div>
          <p className="text-[10px] md:text-xs text-success/80 hidden sm:block">Tüm metrikler normal aralıkta</p>
        </div>

        <div
          className="p-3 md:p-4 rounded-xl bg-warning/10 border border-warning/30 cursor-pointer hover:border-warning/50 transition-colors"
          onClick={() => setSelectedRisk("Medium")}
        >
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-warning/20 flex items-center justify-center">
              <Shield className="w-4 h-4 md:w-5 md:h-5 text-warning" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold font-mono text-warning">{riskDistribution.medium.count}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Orta Risk</p>
            </div>
          </div>
          <p className="text-[10px] md:text-xs text-warning/80 hidden sm:block">İzleme altında, önlem gerekebilir</p>
        </div>

        <div
          className="p-3 md:p-4 rounded-xl bg-destructive/10 border border-destructive/30 relative overflow-hidden cursor-pointer hover:border-destructive/50 transition-colors"
          onClick={() => setSelectedRisk("High")}
        >
          <div className="absolute inset-0 bg-destructive/5 animate-pulse" />
          <div className="relative">
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-destructive/20 flex items-center justify-center pulse-red">
                <ShieldAlert className="w-4 h-4 md:w-5 md:h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xl md:text-2xl font-bold font-mono text-destructive">{riskDistribution.high.count}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">Yüksek Risk</p>
              </div>
            </div>
            <p className="text-[10px] md:text-xs text-destructive/80 hidden sm:block">Acil müdahale gerekli</p>
          </div>
        </div>
      </div>

      {selectedRisk && (
        <RiskDialog
          open={!!selectedRisk}
          onOpenChange={(open) => !open && setSelectedRisk(null)}
          riskLevel={selectedRisk}
          athletes={athletes}
        />
      )}
    </div>
  );
}

export function RiskRadar({ athletes, riskDistribution, criticalAthletes, isLoading }: RiskRadarProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
      <div className="lg:col-span-2 glass rounded-xl border border-border p-4 md:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 md:mb-6">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-foreground">Risk Radarı</h3>
            <p className="text-xs md:text-sm text-muted-foreground">Sporcu hazırlık skoru dağılımı</p>
          </div>
          <div className="px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-primary/10 border border-primary/30 self-start sm:self-auto">
            <span className="text-[10px] md:text-xs font-medium text-primary">Canlı İzleme</span>
          </div>
        </div>
        <RiskGauge riskDistribution={riskDistribution} athletes={athletes} />
      </div>

      <div className="glass rounded-xl border border-destructive/30 p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-destructive/20 flex items-center justify-center pulse-red">
            <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4 text-destructive" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-foreground">Kritik Uyarılar</h3>
            <p className="text-[10px] md:text-xs text-muted-foreground">Acil müdahale gerektiren sporcular</p>
          </div>
        </div>

        <div className="space-y-2 md:space-y-3">
          {criticalAthletes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Kritik uyarı yok 🎉</p>
          )}
          {criticalAthletes.map((athlete, idx) => (
            <Tooltip key={athlete.id}>
              <TooltipTrigger asChild>
                <div
                  onClick={() => navigate(`/athletes/${athlete.id}`)}
                  className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-destructive/10 border border-destructive/20 hover:border-destructive/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className="text-[10px] md:text-xs font-mono text-destructive">#{idx + 1}</span>
                    <div>
                      <p className="text-sm md:text-base font-medium text-foreground">{athlete.name}</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground">{athlete.issue}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg md:text-xl font-bold font-mono text-destructive">%{athlete.risk}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">Risk Skoru</p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-card border-border hidden md:block">
                <p className="text-sm font-medium">Risk Nedeni:</p>
                <p className="text-sm text-muted-foreground">{athlete.issue}</p>
                <p className="text-xs text-primary mt-1">Detay için tıklayın</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  );
}

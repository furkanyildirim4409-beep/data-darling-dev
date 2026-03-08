import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StatCard } from "@/components/dashboard/StatCard";
import { RiskRadar } from "@/components/dashboard/RiskRadar";
import { CompliancePulse } from "@/components/dashboard/CompliancePulse";
import { BusinessPulse } from "@/components/dashboard/BusinessPulse";
import { ActionStream } from "@/components/dashboard/ActionStream";
import { SessionsDialog } from "@/components/dashboard/SessionsDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, Calendar, AlertTriangle } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAlerts } from "@/hooks/useAlerts";

export default function CommandCenter() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionsDialogOpen, setSessionsDialogOpen] = useState(false);
  const { athletes, riskDistribution, criticalAthletes, stats, compliance, isLoading } = useDashboardData();
  const { criticalCount: alertCriticalCount } = useAlerts();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const avgReadiness = athletes.length > 0
    ? (athletes.reduce((sum, a) => sum + (a.readiness_score ?? 75), 0) / athletes.length).toFixed(1)
    : "0";

  const quickStats = [
    { title: "Toplam Sporcu", value: stats.totalAthletes, icon: Users, variant: "default" as const, onClick: () => navigate("/athletes") },
    { title: "Ort. Hazırlık", value: avgReadiness, icon: TrendingUp, variant: "success" as const, onClick: () => navigate("/performance") },
    { title: "Bugünkü Seanslar", value: stats.todaySessions, icon: Calendar, variant: "default" as const, onClick: () => setSessionsDialogOpen(true) },
    { title: "Kritik Uyarılar", value: alertCriticalCount, icon: AlertTriangle, variant: "danger" as const, onClick: () => navigate("/alerts") },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Kokpit</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Durum farkındalık paneli • Gerçek zamanlı izleme</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg bg-success/10 border border-success/30">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_hsl(var(--success))]" />
            <span className="text-xs md:text-sm text-success font-medium hidden sm:inline">Sistem Saati</span>
            <span className="font-mono text-success font-bold ml-1 text-sm md:text-lg">
              {currentTime.toLocaleTimeString("tr-TR")}
            </span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 md:h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {quickStats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6">
        <div className="xl:col-span-3 space-y-4 md:space-y-6">
          <RiskRadar
            athletes={athletes}
            riskDistribution={riskDistribution}
            criticalAthletes={criticalAthletes}
            isLoading={isLoading}
          />
          <CompliancePulse
            workoutCompliance={compliance.workoutCompliance}
            checkinCompliance={compliance.checkinCompliance}
            isLoading={isLoading}
          />
          <BusinessPulse />
        </div>
        <div className="xl:col-span-1">
          <div className="xl:sticky xl:top-6">
            <ActionStream />
          </div>
        </div>
      </div>

      <SessionsDialog open={sessionsDialogOpen} onOpenChange={setSessionsDialogOpen} />
    </div>
  );
}

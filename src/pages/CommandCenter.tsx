import { useState, useEffect } from "react";
import { AiDoctorRadar } from "@/components/dashboard/AiDoctorRadar";
import { useNavigate } from "react-router-dom";
import { StatCard } from "@/components/dashboard/StatCard";
import { RiskRadar } from "@/components/dashboard/RiskRadar";
import { CompliancePulse } from "@/components/dashboard/CompliancePulse";
import { BusinessPulse } from "@/components/dashboard/BusinessPulse";
import { ActionStream } from "@/components/dashboard/ActionStream";
import { SessionsDialog } from "@/components/dashboard/SessionsDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Activity, Utensils, AlertTriangle } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function CommandCenter() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionsDialogOpen, setSessionsDialogOpen] = useState(false);
  const { athletes, riskDistribution, criticalAthletes, stats, compliance, isLoading } = useDashboardData();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Nutrition percentage change from yesterday
  const nutChange = stats.nutritionLoggersYesterday > 0
    ? Math.round(((stats.nutritionLoggersToday - stats.nutritionLoggersYesterday) / stats.nutritionLoggersYesterday) * 100)
    : null;

  const quickStats = [
    {
      title: "Aktif Sporcular",
      value: stats.totalAthletes,
      icon: Users,
      variant: "default" as const,
      onClick: () => navigate("/athletes"),
    },
    {
      title: "Antrenman Uyumu",
      value: `%${compliance.workoutCompliance}`,
      icon: Activity,
      variant: (compliance.workoutCompliance >= 70 ? "success" : compliance.workoutCompliance >= 40 ? "default" : "danger") as "success" | "default" | "danger",
      onClick: () => navigate("/performance"),
    },
    {
      title: "Beslenme Takibi",
      value: `${stats.nutritionLoggersToday}/${stats.totalAthletes}`,
      icon: Utensils,
      variant: (stats.totalAthletes > 0 && stats.nutritionLoggersToday / stats.totalAthletes >= 0.6 ? "success" : "default") as "success" | "default",
      description: nutChange !== null ? `Düne göre ${nutChange >= 0 ? "+" : ""}${nutChange}%` : undefined,
      onClick: () => setSessionsDialogOpen(true),
    },
    {
      title: "Kritik Sporcular",
      value: stats.criticalAlerts,
      icon: AlertTriangle,
      variant: (stats.criticalAlerts > 0 ? "danger" : "success") as "danger" | "success",
      onClick: () => navigate("/alerts"),
    },
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
          <AiDoctorRadar />
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

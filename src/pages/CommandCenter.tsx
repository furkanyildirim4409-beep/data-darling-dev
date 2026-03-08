import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StatCard } from "@/components/dashboard/StatCard";
import { RiskRadar } from "@/components/dashboard/RiskRadar";
import { CompliancePulse } from "@/components/dashboard/CompliancePulse";
import { BusinessPulse } from "@/components/dashboard/BusinessPulse";
import { ActionStream } from "@/components/dashboard/ActionStream";
import { SessionsDialog } from "@/components/dashboard/SessionsDialog";
import { Users, TrendingUp, Calendar, AlertTriangle } from "lucide-react";

export default function CommandCenter() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionsDialogOpen, setSessionsDialogOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const quickStats = [
    { title: "Toplam Sporcu", value: 180, icon: Users, change: { value: 12, type: "increase" as const }, variant: "default" as const, onClick: () => navigate("/athletes") },
    { title: "Ort. Performans", value: "8.4", icon: TrendingUp, change: { value: 5, type: "increase" as const }, variant: "success" as const, onClick: () => navigate("/performance") },
    { title: "Bugünkü Seanslar", value: 23, icon: Calendar, variant: "default" as const, onClick: () => setSessionsDialogOpen(true) },
    { title: "Kritik Uyarılar", value: 15, icon: AlertTriangle, change: { value: 2, type: "decrease" as const }, variant: "danger" as const, onClick: () => navigate("/alerts") },
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
            <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_#22c55e]" />
            <span className="text-xs md:text-sm text-success font-medium hidden sm:inline">Sistem Saati</span>
            <span className="font-mono text-success font-bold ml-1 text-sm md:text-lg">
              {currentTime.toLocaleTimeString("tr-TR")}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {quickStats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6">
        <div className="xl:col-span-3 space-y-4 md:space-y-6">
          <RiskRadar />
          <CompliancePulse />
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

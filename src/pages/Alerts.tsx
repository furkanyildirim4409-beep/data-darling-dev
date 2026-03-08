import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertActionCard } from "@/components/alerts/AlertActionCard";
import { QuickFiltersPanel, QuickFilter } from "@/components/alerts/QuickFiltersPanel";
import {
  CheckCheck,
  Zap,
  AlertTriangle,
  Clock,
  Bell,
  Send,
  Activity,
} from "lucide-react";
import { useAlerts } from "@/hooks/useAlerts";
import { toast } from "@/hooks/use-toast";

type TypeFilter = "all" | "critical" | "warning" | "info";

export default function Alerts() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [quickMessage, setQuickMessage] = useState("");
  const [dismissedIds, setDismissedIds] = useState<Set<string | number>>(new Set());

  const {
    alerts: allAlerts,
    isLoading,
    criticalCount: totalCritical,
    warningCount: totalWarning,
    infoCount: totalInfo,
    healthAlerts,
    paymentAlerts,
    programAlerts,
    checkinAlerts,
  } = useAlerts();

  // Get alerts based on quick filter
  const quickFilteredAlerts = useMemo(() => {
    switch (quickFilter) {
      case "health": return healthAlerts;
      case "payment": return paymentAlerts;
      case "program": return programAlerts;
      case "checkin": return checkinAlerts;
      default: return allAlerts;
    }
  }, [quickFilter, allAlerts, healthAlerts, paymentAlerts, programAlerts, checkinAlerts]);

  // Apply type filter and remove dismissed
  const filteredAlerts = useMemo(() => {
    let alerts = quickFilteredAlerts.filter((a) => !dismissedIds.has(a.id));
    if (typeFilter !== "all") {
      alerts = alerts.filter((a) => a.level === typeFilter);
    }
    return alerts;
  }, [quickFilteredAlerts, typeFilter, dismissedIds]);

  const criticalCount = filteredAlerts.filter((a) => a.level === "critical").length;
  const warningCount = filteredAlerts.filter((a) => a.level === "warning").length;
  const infoCount = filteredAlerts.filter((a) => a.level === "info").length;

  const filterCounts = useMemo(() => ({
    health: healthAlerts.filter((a) => !dismissedIds.has(a.id)).length,
    payment: paymentAlerts.filter((a) => !dismissedIds.has(a.id)).length,
    program: programAlerts.filter((a) => !dismissedIds.has(a.id)).length,
    checkin: checkinAlerts.filter((a) => !dismissedIds.has(a.id)).length,
  }), [dismissedIds, healthAlerts, paymentAlerts, programAlerts, checkinAlerts]);

  const handleDismiss = (id: number) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  const handleMarkAllRead = () => {
    setDismissedIds(new Set(allAlerts.map((a) => a.id)));
    toast({ title: "Tümü Okundu", description: "Tüm uyarılar okundu olarak işaretlendi." });
  };

  const handleSendBroadcast = () => {
    if (!quickMessage.trim()) {
      toast({ title: "Hata", description: "Lütfen bir mesaj yazın.", variant: "destructive" });
      return;
    }
    toast({ title: "Duyuru Gönderildi", description: "Mesaj tüm sporculara iletildi." });
    setQuickMessage("");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Hızlı Müdahale</h1>
          <p className="text-muted-foreground mt-1">
            <span className="font-mono text-destructive">{totalCritical}</span> kritik,{" "}
            <span className="font-mono text-warning">{totalWarning}</span> uyarı,{" "}
            <span className="font-mono text-primary">{totalInfo}</span> bilgi
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-border hover:bg-secondary" onClick={handleMarkAllRead}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Tümünü Okundu İşaretle
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Type Filter Tabs */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" onClick={() => setTypeFilter("all")} className={cn("cursor-pointer transition-all px-3 py-1.5", typeFilter === "all" ? "bg-secondary text-foreground border-border" : "hover:bg-secondary")}>
              Tümü ({filteredAlerts.length})
            </Badge>
            <Badge variant="outline" onClick={() => setTypeFilter("critical")} className={cn("cursor-pointer transition-all px-3 py-1.5", typeFilter === "critical" ? "bg-destructive/10 text-destructive border-destructive/30" : "hover:bg-secondary border-destructive/30 text-destructive")}>
              <AlertTriangle className="w-3 h-3 mr-1" />Kritik ({criticalCount})
            </Badge>
            <Badge variant="outline" onClick={() => setTypeFilter("warning")} className={cn("cursor-pointer transition-all px-3 py-1.5", typeFilter === "warning" ? "bg-warning/10 text-warning border-warning/30" : "hover:bg-secondary border-warning/30 text-warning")}>
              <Clock className="w-3 h-3 mr-1" />Uyarılar ({warningCount})
            </Badge>
            <Badge variant="outline" onClick={() => setTypeFilter("info")} className={cn("cursor-pointer transition-all px-3 py-1.5", typeFilter === "info" ? "bg-primary/10 text-primary border-primary/30" : "hover:bg-secondary border-primary/30 text-primary")}>
              <Bell className="w-3 h-3 mr-1" />Bilgi ({infoCount})
            </Badge>
          </div>

          {/* Alerts */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="glass rounded-xl border border-border p-12 text-center">
                <Activity className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-muted-foreground">Bu kategoride uyarı bulunmuyor.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Sporcularınızın verileri normal aralıkta</p>
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <AlertActionCard key={alert.id} alert={alert} onDismiss={handleDismiss} />
              ))
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          <QuickFiltersPanel activeFilter={quickFilter} onFilterChange={setQuickFilter} counts={filterCounts} />

          <div className="glass rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-4">Uyarı Özeti</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Toplam Uyarı</span>
                <span className="font-mono text-foreground text-lg">{allAlerts.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bekleyen Kritik</span>
                <span className="font-mono text-destructive text-lg">{totalCritical}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Uyarılar</span>
                <span className="font-mono text-warning text-lg">{totalWarning}</span>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-4">Hızlı Duyuru</h3>
            <Textarea
              placeholder="Tüm sporculara mesaj gönderin..."
              value={quickMessage}
              onChange={(e) => setQuickMessage(e.target.value)}
              className="min-h-[100px] bg-card border-border focus:border-primary resize-none mb-3"
            />
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSendBroadcast}>
              <Send className="w-4 h-4 mr-2" />Hepsine Gönder
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

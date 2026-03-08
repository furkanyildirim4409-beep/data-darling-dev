import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertActionCard } from "@/components/alerts/AlertActionCard";
import { QuickFiltersPanel, QuickFilter } from "@/components/alerts/QuickFiltersPanel";
import {
  CheckCheck,
  Zap,
  AlertTriangle,
  Clock,
  Bell,
  Send,
} from "lucide-react";
import { RapidResponse } from "@/components/athletes/RapidResponse";
import { getAthletesNeedingAttention } from "@/data/athletes";
import { 
  allAlerts, 
  getHealthAlerts, 
  getPaymentAlerts, 
  getProgramAlerts, 
  getCheckinAlerts,
} from "@/data/alerts";
import { Notification } from "@/types/shared-models";
import { toast } from "@/hooks/use-toast";

type TypeFilter = "all" | "critical" | "warning" | "info";

export default function Alerts() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [showRapidResponse, setShowRapidResponse] = useState(false);
  const [quickMessage, setQuickMessage] = useState("");
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);
  
  const athletesNeedingAttention = getAthletesNeedingAttention();

  // Get alerts based on quick filter
  const quickFilteredAlerts = useMemo(() => {
    switch (quickFilter) {
      case "health":
        return getHealthAlerts();
      case "payment":
        return getPaymentAlerts();
      case "program":
        return getProgramAlerts();
      case "checkin":
        return getCheckinAlerts();
      default:
        return allAlerts;
    }
  }, [quickFilter]);

  // Helper to get numeric id
  const getNumericId = (id: string | number): number => 
    typeof id === 'number' ? id : parseInt(id, 10);

  // Apply type filter and remove dismissed
  const filteredAlerts = useMemo(() => {
    let alerts = quickFilteredAlerts.filter(a => !dismissedIds.includes(getNumericId(a.id)));
    
    if (typeFilter !== "all") {
      alerts = alerts.filter(a => a.level === typeFilter);
    }
    
    return alerts;
  }, [quickFilteredAlerts, typeFilter, dismissedIds]);

  // Count for badges
  const criticalCount = filteredAlerts.filter((a) => a.level === "critical").length;
  const warningCount = filteredAlerts.filter((a) => a.level === "warning").length;
  const infoCount = filteredAlerts.filter((a) => a.level === "info").length;

  // Counts for quick filters
  const filterCounts = useMemo(() => ({
    health: getHealthAlerts().filter(a => !dismissedIds.includes(getNumericId(a.id))).length,
    payment: getPaymentAlerts().filter(a => !dismissedIds.includes(getNumericId(a.id))).length,
    program: getProgramAlerts().filter(a => !dismissedIds.includes(getNumericId(a.id))).length,
    checkin: getCheckinAlerts().filter(a => !dismissedIds.includes(getNumericId(a.id))).length,
  }), [dismissedIds]);

  const handleDismiss = (id: number) => {
    setDismissedIds(prev => [...prev, id]);
  };

  const handleMarkAllRead = () => {
    setDismissedIds(allAlerts.map(a => getNumericId(a.id)));
    toast({
      title: "Tümü Okundu",
      description: "Tüm uyarılar okundu olarak işaretlendi.",
    });
  };

  const handleSendBroadcast = () => {
    if (!quickMessage.trim()) {
      toast({
        title: "Hata",
        description: "Lütfen bir mesaj yazın.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Duyuru Gönderildi",
      description: "Mesaj tüm sporculara iletildi.",
    });
    setQuickMessage("");
  };

  if (showRapidResponse) {
    return <RapidResponse onClose={() => setShowRapidResponse(false)} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Hızlı Müdahale
          </h1>
          <p className="text-muted-foreground mt-1">
            <span className="font-mono text-destructive">{criticalCount}</span> kritik,{" "}
            <span className="font-mono text-warning">{warningCount}</span> uyarı,{" "}
            <span className="font-mono text-primary">{infoCount}</span> bilgi
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowRapidResponse(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 glow-lime"
          >
            <Zap className="w-4 h-4 mr-2" />
            Odak Modu
            <span className="ml-2 font-mono bg-primary-foreground/20 px-2 py-0.5 rounded text-xs">
              {athletesNeedingAttention.length}
            </span>
          </Button>
          <Button 
            variant="outline" 
            className="border-border hover:bg-secondary"
            onClick={handleMarkAllRead}
          >
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
            <Badge
              variant="outline"
              onClick={() => setTypeFilter("all")}
              className={cn(
                "cursor-pointer transition-all px-3 py-1.5",
                typeFilter === "all"
                  ? "bg-secondary text-foreground border-border"
                  : "hover:bg-secondary"
              )}
            >
              Tümü ({filteredAlerts.length})
            </Badge>
            <Badge
              variant="outline"
              onClick={() => setTypeFilter("critical")}
              className={cn(
                "cursor-pointer transition-all px-3 py-1.5",
                typeFilter === "critical"
                  ? "bg-destructive/10 text-destructive border-destructive/30"
                  : "hover:bg-secondary border-destructive/30 text-destructive"
              )}
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Kritik ({criticalCount})
            </Badge>
            <Badge
              variant="outline"
              onClick={() => setTypeFilter("warning")}
              className={cn(
                "cursor-pointer transition-all px-3 py-1.5",
                typeFilter === "warning"
                  ? "bg-warning/10 text-warning border-warning/30"
                  : "hover:bg-secondary border-warning/30 text-warning"
              )}
            >
              <Clock className="w-3 h-3 mr-1" />
              Uyarılar ({warningCount})
            </Badge>
            <Badge
              variant="outline"
              onClick={() => setTypeFilter("info")}
              className={cn(
                "cursor-pointer transition-all px-3 py-1.5",
                typeFilter === "info"
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "hover:bg-secondary border-primary/30 text-primary"
              )}
            >
              <Bell className="w-3 h-3 mr-1" />
              Bilgi ({infoCount})
            </Badge>
          </div>

          {/* Alerts */}
          <div className="space-y-3">
            {filteredAlerts.map((alert) => (
              <AlertActionCard 
                key={alert.id} 
                alert={alert}
                onDismiss={handleDismiss}
              />
            ))}
          </div>

          {filteredAlerts.length === 0 && (
            <div className="glass rounded-xl border border-border p-12 text-center">
              <p className="text-muted-foreground">Bu kategoride uyarı bulunmuyor.</p>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Quick Filters Panel */}
          <QuickFiltersPanel
            activeFilter={quickFilter}
            onFilterChange={setQuickFilter}
            counts={filterCounts}
          />

          {/* Stats */}
          <div className="glass rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-4">Müdahale İstatistikleri</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ort. Yanıt Süresi</span>
                <span className="font-mono text-primary text-lg">4.2 dk</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bugün Çözülen</span>
                <span className="font-mono text-success text-lg">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bekleyen Kritik</span>
                <span className="font-mono text-destructive text-lg">{criticalCount}</span>
              </div>
            </div>
          </div>

          {/* Quick Message */}
          <div className="glass rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-4">Hızlı Duyuru</h3>
            <Textarea
              placeholder="Tüm sporculara mesaj gönderin..."
              value={quickMessage}
              onChange={(e) => setQuickMessage(e.target.value)}
              className="min-h-[100px] bg-card border-border focus:border-primary resize-none mb-3"
            />
            <Button 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSendBroadcast}
            >
              <Send className="w-4 h-4 mr-2" />
              Hepsine Gönder
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

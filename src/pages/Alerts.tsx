import { useState, useMemo, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertActionCard } from "@/components/alerts/AlertActionCard";
import { QuickFiltersPanel, QuickFilter } from "@/components/alerts/QuickFiltersPanel";
import {
  CheckCheck,
  AlertTriangle,
  Clock,
  Bell,
  Send,
  Activity,
  Brain,
  Pill,
  Dumbbell,
  MessageSquare,
  UtensilsCrossed,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type TypeFilter = "all" | "critical" | "warning" | "info";

interface AiAction {
  type: "supplement" | "program" | "message" | "nutrition";
  label: string;
  payload: string;
}

interface AiIntervention {
  id: string;
  athlete_id: string;
  athlete_name: string | null;
  severity: string;
  title: string;
  analysis: string;
  actions: AiAction[];
  created_at: string;
}

const actionIcons: Record<string, typeof Pill> = {
  supplement: Pill,
  program: Dumbbell,
  message: MessageSquare,
  nutrition: UtensilsCrossed,
};

const actionColors: Record<string, string> = {
  supplement: "border-purple-500/30 text-purple-400 hover:bg-purple-500/10",
  program: "border-primary/30 text-primary hover:bg-primary/10",
  message: "border-blue-500/30 text-blue-400 hover:bg-blue-500/10",
  nutrition: "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10",
};

export default function Alerts() {
  const { user } = useAuth();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [quickMessage, setQuickMessage] = useState("");
  const [dismissedIds, setDismissedIds] = useState<Set<string | number>>(new Set());

  // AI Interventions state
  const [aiInterventions, setAiInterventions] = useState<AiIntervention[]>([]);
  const [aiLoading, setAiLoading] = useState(true);
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());

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

  // Fetch AI interventions
  const fetchAiInterventions = useCallback(async () => {
    if (!user) return;
    setAiLoading(true);
    const { data } = await supabase
      .from("ai_weekly_analyses")
      .select("id, athlete_id, athlete_name, severity, title, analysis, actions, created_at")
      .eq("resolved", false)
      .in("severity", ["high", "medium"])
      .order("created_at", { ascending: false });

    const items = (data || []).map((row: any) => ({
      ...row,
      actions: Array.isArray(row.actions) ? row.actions : [],
    })) as AiIntervention[];

    setAiInterventions(items);
    setAiLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAiInterventions();
  }, [fetchAiInterventions]);

  // Handle action execute
  const handleActionExecute = async (interventionId: string, action: AiAction) => {
    setResolvingIds((prev) => new Set(prev).add(interventionId));

    // Update resolved in DB
    const { error } = await supabase
      .from("ai_weekly_analyses")
      .update({ resolved: true } as any)
      .eq("id", interventionId);

    if (error) {
      toast({ title: "Hata", description: "Aksiyon işlenemedi.", variant: "destructive" });
      setResolvingIds((prev) => {
        const next = new Set(prev);
        next.delete(interventionId);
        return next;
      });
      return;
    }

    // Optimistically remove
    setAiInterventions((prev) => prev.filter((i) => i.id !== interventionId));
    setResolvingIds((prev) => {
      const next = new Set(prev);
      next.delete(interventionId);
      return next;
    });

    toast({
      title: "✅ Aksiyon Alındı",
      description: `${action.label} — Sporcuya bildirim gönderildi.`,
    });
  };

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

      {/* AI Intervention Queue */}
      {(aiInterventions.length > 0 || aiLoading) && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">AI Müdahale Kuyruğu</h2>
              <p className="text-xs text-muted-foreground">
                Yapay zeka tarafından tespit edilen sorunlar — tek tıkla çöz
              </p>
            </div>
            {aiInterventions.length > 0 && (
              <Badge className="ml-auto bg-destructive/20 text-destructive border-destructive/30">
                {aiInterventions.length} bekleyen
              </Badge>
            )}
          </div>

          {aiLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {aiInterventions.map((intervention) => {
                const isHigh = intervention.severity === "high";
                const borderColor = isHigh ? "border-l-destructive" : "border-l-warning";
                const sevLabel = isHigh ? "Kritik" : "Dikkat";
                const sevBadge = isHigh
                  ? "bg-destructive/20 text-destructive border-destructive/30"
                  : "bg-warning/20 text-warning border-warning/30";
                const isResolving = resolvingIds.has(intervention.id);

                return (
                  <div
                    key={intervention.id}
                    className={cn(
                      "glass rounded-xl border border-border p-5 border-l-4 transition-all",
                      borderColor,
                      isResolving && "opacity-50 pointer-events-none"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Brain className={cn("w-5 h-5 shrink-0", isHigh ? "text-destructive" : "text-warning")} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-foreground">{intervention.title}</span>
                            <Badge variant="outline" className={cn("text-xs", sevBadge)}>{sevLabel}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {intervention.athlete_name || "Sporcu"} • {new Date(intervention.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                      {intervention.analysis}
                    </p>

                    {/* Action Buttons */}
                    {intervention.actions.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {intervention.actions.map((action, idx) => {
                          const Icon = actionIcons[action.type] || Sparkles;
                          const colorCls = actionColors[action.type] || "border-border text-foreground hover:bg-secondary";

                          return (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              className={cn("text-xs gap-1.5 border", colorCls)}
                              onClick={() => handleActionExecute(intervention.id, action)}
                              disabled={isResolving}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {action.label}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
              {aiInterventions.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">AI Müdahale</span>
                  <span className="font-mono text-primary text-lg">{aiInterventions.length}</span>
                </div>
              )}
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

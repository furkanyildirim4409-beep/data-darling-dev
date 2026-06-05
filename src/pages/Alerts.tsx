import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { AlertActionCard } from "@/components/alerts/AlertActionCard";
import { QuickFiltersPanel, QuickFilter } from "@/components/alerts/QuickFiltersPanel";
import { ActionLedgerDesk } from "@/components/dashboard/ActionLedgerDesk";
import {
  CheckCheck,
  AlertTriangle,
  Clock,
  Bell,
  Send,
  Activity,
  Brain,
  ChevronDown,
  ChevronUp,
  EyeOff,
  ListPlus,
  Zap,
} from "lucide-react";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type TypeFilter = "all" | "critical" | "warning" | "info";

interface AiActionItem {
  type?: string;
  label?: string;
  title?: string;
  payload?: string;
  description?: string;
  is_quantitative?: boolean;
}

interface AiIntervention {
  id: string;
  athlete_id: string;
  athlete_name: string | null;
  severity: string;
  title: string;
  analysis: string;
  actions: AiActionItem[];
  created_at: string;
}

type ChecklistStatus = "done" | "dismissed";

type LedgerStatus = "pending" | "ignored";

export default function Alerts() {
  const { user, activeCoachId, isSubCoach, teamMember, teamMemberPermissions } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [quickMessage, setQuickMessage] = useState("");
  const [dismissedIds, setDismissedIds] = useState<Set<string | number>>(new Set());

  const [aiInterventions, setAiInterventions] = useState<AiIntervention[]>([]);
  const [aiLoading, setAiLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<Record<string, ChecklistStatus>>({});

  const toggleChecklist = (key: string, next: ChecklistStatus) => {
    setActionStatus((prev) => {
      const copy = { ...prev };
      if (copy[key] === next) {
        delete copy[key];
      } else {
        copy[key] = next;
      }
      return copy;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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

  const fetchAiInterventions = useCallback(async () => {
    if (!user) return;
    setAiLoading(true);

    let assignedIds: string[] | null = null;
    if (isSubCoach && teamMemberPermissions !== "full" && teamMember?.id) {
      const { data: assignmentData } = await supabase
        .from("team_member_athletes")
        .select("athlete_id")
        .eq("team_member_id", teamMember.id);

      if (!assignmentData || assignmentData.length === 0) {
        setAiInterventions([]);
        setAiLoading(false);
        return;
      }
      assignedIds = assignmentData.map((a) => a.athlete_id);
    }

    let query = supabase
      .from("ai_weekly_analyses")
      .select("id, athlete_id, athlete_name, severity, title, analysis, actions, created_at")
      .eq("resolved", false)
      .in("severity", ["high", "medium"])
      .order("created_at", { ascending: false });

    if (assignedIds) {
      query = query.in("athlete_id", assignedIds);
    }

    const { data } = await query;
    const items = ((data || []) as Array<Record<string, unknown>>).map((row) => ({
      id: row.id as string,
      athlete_id: row.athlete_id as string,
      athlete_name: (row.athlete_name as string | null) ?? null,
      severity: row.severity as string,
      title: row.title as string,
      analysis: row.analysis as string,
      actions: Array.isArray(row.actions) ? (row.actions as AiActionItem[]) : [],
      created_at: row.created_at as string,
    })) as AiIntervention[];

    // Filter out interventions already triaged in the ledger
    const ids = items.map((i) => i.id);
    if (ids.length > 0) {
      const { data: ledgered } = await (supabase as any)
        .from("coach_action_ledger")
        .select("source_insight_id")
        .in("source_insight_id", ids);
      const triaged = new Set(
        ((ledgered ?? []) as Array<{ source_insight_id: string | null }>)
          .map((r) => r.source_insight_id)
          .filter(Boolean) as string[]
      );
      setAiInterventions(items.filter((i) => !triaged.has(i.id)));
    } else {
      setAiInterventions(items);
    }
    setAiLoading(false);
  }, [user, isSubCoach, teamMember, teamMemberPermissions]);

  useEffect(() => {
    fetchAiInterventions();
  }, [fetchAiInterventions]);

  const triageIntervention = async (intervention: AiIntervention, status: LedgerStatus) => {
    if (!user) return;
    const coachId = activeCoachId ?? user.id;
    setBusyId(intervention.id);
    setOpenPopoverId(null);

    // Optimistic removal
    setAiInterventions((prev) => prev.filter((i) => i.id !== intervention.id));

    const issueType =
      intervention.severity === "high" ? "biometric_anomaly" : "low_adherence";

    const { error } = await (supabase as any).from("coach_action_ledger").insert({
      coach_id: coachId,
      athlete_id: intervention.athlete_id,
      issue_title: intervention.title,
      issue_type: issueType,
      issue_details: {
        description: intervention.analysis,
        detailed_analysis: intervention.analysis,
        athlete_name: intervention.athlete_name,
        severity: intervention.severity,
        created_at: intervention.created_at,
        source: "alerts_ai_intervention_queue",
        suggested_manual_actions: intervention.actions ?? [],
        biometric_context: "",
      },
      source_insight_id: intervention.id,
      status,
    });

    setBusyId(null);

    if (error) {
      toast({
        title: "Hata",
        description: "Eylem kaydedilemedi.",
        variant: "destructive",
      });
      fetchAiInterventions();
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["coach_action_ledger"] });

    toast({
      title: status === "ignored" ? "Yok sayıldı" : "Takip listesine eklendi",
      description:
        status === "ignored"
          ? "Bulgu radar dışına çıkarıldı."
          : "Kritik Masası & Eylem Defteri'nden takip edebilirsin.",
    });
  };

  const quickFilteredAlerts = useMemo(() => {
    switch (quickFilter) {
      case "health":
        return healthAlerts;
      case "payment":
        return paymentAlerts;
      case "program":
        return programAlerts;
      case "checkin":
        return checkinAlerts;
      default:
        return allAlerts;
    }
  }, [quickFilter, allAlerts, healthAlerts, paymentAlerts, programAlerts, checkinAlerts]);

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

  const filterCounts = useMemo(
    () => ({
      health: healthAlerts.filter((a) => !dismissedIds.has(a.id)).length,
      payment: paymentAlerts.filter((a) => !dismissedIds.has(a.id)).length,
      program: programAlerts.filter((a) => !dismissedIds.has(a.id)).length,
      checkin: checkinAlerts.filter((a) => !dismissedIds.has(a.id)).length,
    }),
    [dismissedIds, healthAlerts, paymentAlerts, programAlerts, checkinAlerts]
  );

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

      {/* AI Intervention Queue — Triage */}
      {(aiInterventions.length > 0 || aiLoading) && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">AI Müdahale Kuyruğu</h2>
              <p className="text-xs text-muted-foreground">
                Yapay zeka bulgularını triyaj et — Yok say veya Takip Listesi'ne ekle
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
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {aiInterventions.map((intervention) => {
                  const isHigh = intervention.severity === "high";
                  const borderColor = isHigh ? "border-l-destructive" : "border-l-warning";
                  const sevLabel = isHigh ? "Kritik" : "Dikkat";
                  const sevBadge = isHigh
                    ? "bg-destructive/20 text-destructive border-destructive/30"
                    : "bg-warning/20 text-warning border-warning/30";
                  const isBusy = busyId === intervention.id;
                  return (
                    <motion.div
                      key={intervention.id}
                      layout
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                      transition={{ duration: 0.25 }}
                      className={cn(
                        "glass rounded-xl border border-border p-5 border-l-4 transition-all",
                        borderColor
                      )}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Brain
                            className={cn(
                              "w-5 h-5 shrink-0",
                              isHigh ? "text-destructive" : "text-warning"
                            )}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-foreground">
                                {intervention.title}
                              </span>
                              <Badge variant="outline" className={cn("text-xs", sevBadge)}>
                                {sevLabel}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {intervention.athlete_name || "Sporcu"} •{" "}
                              {new Date(intervention.created_at).toLocaleDateString("tr-TR", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>

                        <Popover
                          open={openPopoverId === intervention.id}
                          onOpenChange={(o) => setOpenPopoverId(o ? intervention.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10 shrink-0"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              Eylem Al
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="end"
                            className="w-64 bg-popover/95 backdrop-blur border-border p-3"
                          >
                            <p className="text-xs text-muted-foreground mb-3 px-1">
                              Bu bulgu için karar ver
                            </p>
                            <div className="space-y-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full justify-start gap-2 border-border hover:bg-secondary"
                                onClick={() => triageIntervention(intervention, "ignored")}
                                disabled={isBusy}
                              >
                                <EyeOff className="w-4 h-4 text-muted-foreground" />
                                Yok Say
                              </Button>
                              <Button
                                size="sm"
                                className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                                onClick={() => triageIntervention(intervention, "pending")}
                                disabled={isBusy}
                              >
                                <ListPlus className="w-4 h-4" />
                                Listeye Ekle
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <button
                        onClick={() => toggleExpand(intervention.id)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {expandedIds.has(intervention.id) ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            Detaylı Analizi Gizle
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            Detaylı Analizi Gör
                          </>
                        )}
                      </button>
                      {expandedIds.has(intervention.id) && (
                        <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line border-l-2 border-border pl-3">
                            {intervention.analysis}
                          </p>
                        </div>
                      )}

                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Kritik Masası & Eylem Defteri */}
      <ActionLedgerDesk />

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
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="glass rounded-xl border border-border p-12 text-center">
                <Activity className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-muted-foreground">Bu kategoride uyarı bulunmuyor.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Sporcularınızın verileri normal aralıkta
                </p>
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
          <QuickFiltersPanel
            activeFilter={quickFilter}
            onFilterChange={setQuickFilter}
            counts={filterCounts}
          />

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

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Clock,
  Pill,
  Dumbbell,
  MessageSquare,
  UtensilsCrossed,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { executeAiAction, type AiAction } from "@/services/ActionEngine";
import { MutationConfigDialog } from "@/components/action-engine/MutationConfigDialog";
import { useAuth } from "@/contexts/AuthContext";

interface AiInsight {
  id: string;
  severity: string;
  title: string;
  analysis: string;
  created_at: string;
  actions: AiAction[];
  resolved?: boolean;
}

type SeverityKey = "high" | "medium" | "low";

const severityConfig: Record<
  SeverityKey,
  {
    icon: typeof AlertTriangle;
    label: string;
    cardBg: string;
    textColor: string;
    badgeCls: string;
    ringColor: string;
    borderColor: string;
  }
> = {
  high: {
    icon: AlertTriangle,
    label: "Kritik",
    cardBg: "bg-destructive/10 border-destructive/30 hover:bg-destructive/15",
    textColor: "text-destructive",
    badgeCls: "bg-destructive/20 text-destructive border-destructive/30",
    ringColor: "ring-destructive/40",
    borderColor: "border-l-destructive",
  },
  medium: {
    icon: AlertCircle,
    label: "Dikkat",
    cardBg: "bg-warning/10 border-warning/30 hover:bg-warning/15",
    textColor: "text-warning",
    badgeCls: "bg-warning/20 text-warning border-warning/30",
    ringColor: "ring-warning/40",
    borderColor: "border-l-warning",
  },
  low: {
    icon: CheckCircle2,
    label: "Olumlu",
    cardBg: "bg-success/10 border-success/30 hover:bg-success/15",
    textColor: "text-success",
    badgeCls: "bg-success/20 text-success border-success/30",
    ringColor: "ring-success/40",
    borderColor: "border-l-success",
  },
};

const actionTypeIcons: Record<string, typeof Pill> = {
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

function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  athleteId: string;
}

export function AiHistoryWidget({ athleteId }: Props) {
  const { user } = useAuth();
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityKey | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
  const [pendingAction, setPendingAction] = useState<{ id: string; action: AiAction } | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleActionExecute = async (insightId: string, action: AiAction, mutationPercentage?: number) => {
    const insight = insights.find((i) => i.id === insightId);
    if (!insight || !user) return;

    setResolvingIds((prev) => new Set(prev).add(`${insightId}-${action.label}`));

    try {
      const result = await executeAiAction(
        athleteId,
        user.id,
        action,
        insightId,
        insight.actions,
        mutationPercentage
      );

      setInsights((prev) =>
        prev.map((i) =>
          i.id === insightId
            ? { ...i, actions: result.updatedActions, resolved: result.isFullyResolved }
            : i
        )
      );

      toast({
        title: "✅ Aksiyon Alındı",
        description: `${action.label} — Sporcuya bildirim gönderildi.${mutationPercentage !== undefined ? ` (${mutationPercentage > 0 ? '+' : ''}${mutationPercentage}%)` : ''}`,
      });
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "Aksiyon işlenemedi.", variant: "destructive" });
    } finally {
      setResolvingIds((prev) => {
        const next = new Set(prev);
        next.delete(`${insightId}-${action.label}`);
        return next;
      });
    }
  };

  const handleActionClick = (insightId: string, action: AiAction) => {
    if (action.type === "program" || action.type === "nutrition") {
      setPendingAction({ id: insightId, action });
    } else {
      handleActionExecute(insightId, action);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("ai_weekly_analyses")
        .select("id, severity, title, analysis, created_at, actions, resolved")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(500);

      const items = ((data as any[]) || []).map((row) => ({
        ...row,
        actions: Array.isArray(row.actions) ? row.actions : [],
      })) as AiInsight[];

      setInsights(items);

      if (items.length > 0) {
        setSelectedSession(items[0].created_at);
      } else {
        setSelectedSession(null);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [athleteId]);

  const sessionDates = useMemo(() => {
    const set = new Set<string>();
    for (const i of insights) set.add(i.created_at);
    return Array.from(set).sort((a, b) => (b > a ? 1 : -1));
  }, [insights]);

  const sessionInsights = useMemo(
    () =>
      selectedSession
        ? insights.filter((i) => i.created_at === selectedSession)
        : [],
    [insights, selectedSession]
  );

  const grouped = useMemo(() => {
    const map: Record<SeverityKey, AiInsight[]> = { high: [], medium: [], low: [] };
    for (const i of sessionInsights) {
      const key = (i.severity as SeverityKey) || "low";
      if (map[key]) map[key].push(i);
    }
    return map;
  }, [sessionInsights]);

  const filteredBySelection = useMemo(
    () =>
      selectedSeverity
        ? sessionInsights.filter(
            (i) => ((i.severity as SeverityKey) || "low") === selectedSeverity
          )
        : [],
    [sessionInsights, selectedSeverity]
  );

  if (isLoading) {
    return (
      <Card className="glass border-border">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card className="glass border-border">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Sparkles className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            Bu sporcu için henüz yapay zeka taraması yapılmadı.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Yukarıdaki "🧠 AI Taraması" butonunu kullanarak ilk analizi başlatabilirsiniz.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass border-border overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-foreground">
                  AI Tarama Geçmişi
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {sessionDates.length} tarama kaydı
                </p>
              </div>
            </div>

            <Select
              value={selectedSession || ""}
              onValueChange={setSelectedSession}
            >
              <SelectTrigger className="w-[260px] bg-card border-border">
                <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Tarama seçin" />
              </SelectTrigger>
              <SelectContent>
                {sessionDates.map((iso) => (
                  <SelectItem key={iso} value={iso}>
                    {formatSessionDate(iso)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {(["high", "medium", "low"] as SeverityKey[]).map((severity) => {
              const config = severityConfig[severity];
              const Icon = config.icon;
              const count = grouped[severity].length;

              return (
                <button
                  key={severity}
                  onClick={() => count > 0 && setSelectedSeverity(severity)}
                  disabled={count === 0}
                  className={`rounded-xl border p-4 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default ${config.cardBg} ring-0 hover:ring-2 ${config.ringColor}`}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Icon className={`w-7 h-7 ${config.textColor}`} />
                    <span className={`text-3xl font-black ${config.textColor}`}>
                      {count}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${config.badgeCls}`}
                    >
                      {config.label}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedSeverity} onOpenChange={() => setSelectedSeverity(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedSeverity && (() => {
                const config = severityConfig[selectedSeverity];
                const Icon = config.icon;
                return (
                  <>
                    <Icon className={`w-5 h-5 ${config.textColor}`} />
                    <span>{config.label} Bulgular</span>
                    <Badge variant="outline" className={`ml-auto ${config.badgeCls}`}>
                      {filteredBySelection.length} bulgu
                    </Badge>
                  </>
                );
              })()}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 pr-3">
              {filteredBySelection.map((insight) => {
                const sev = (insight.severity as SeverityKey) || "low";
                const config = severityConfig[sev];
                const Icon = config.icon;

                return (
                  <div
                    key={insight.id}
                    className={`rounded-lg border border-border bg-card p-4 border-l-4 ${config.borderColor}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.textColor}`} />
                      <div className="min-w-0 w-full">
                        <p className="text-sm font-semibold text-foreground mb-1">
                          {insight.title}
                        </p>

                        {/* Action Buttons */}
                        {insight.actions.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-2 mb-2">
                            {insight.actions.map((action, idx) => {
                              const isActionCompleted = action.completed === true;
                              const isActionResolving = resolvingIds.has(`${insight.id}-${action.label}`);
                              const ActionIcon = actionTypeIcons[action.type] || Sparkles;
                              const colorCls = actionColors[action.type] || "border-border text-foreground hover:bg-secondary";

                              if (isActionCompleted) {
                                return (
                                  <Button
                                    key={idx}
                                    variant="outline"
                                    size="sm"
                                    disabled
                                    className="text-[10px] gap-1 px-2 py-0.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 opacity-80 cursor-not-allowed"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    {action.label}
                                  </Button>
                                );
                              }

                              return (
                                <Button
                                  key={idx}
                                  variant="outline"
                                  size="sm"
                                  className={`text-[10px] gap-1 px-2 py-0.5 border ${colorCls}`}
                                  onClick={() => handleActionClick(insight.id, action)}
                                  disabled={isActionResolving}
                                >
                                  <ActionIcon className="w-3 h-3" />
                                  {isActionResolving ? "İşleniyor..." : action.label}
                                </Button>
                              );
                            })}
                          </div>
                        )}

                        {/* Collapsible Analysis */}
                        <button
                          onClick={() => toggleExpand(insight.id)}
                          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {expandedIds.has(insight.id) ? (
                            <><ChevronUp className="w-3 h-3" />Detaylı Analizi Gizle</>
                          ) : (
                            <><ChevronDown className="w-3 h-3" />Detaylı Analizi Gör</>
                          )}
                        </button>
                        {expandedIds.has(insight.id) && (
                          <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line border-l-2 border-border pl-3">
                              {insight.analysis}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";

interface AiInsight {
  id: string;
  severity: string;
  title: string;
  analysis: string;
  created_at: string;
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
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("ai_weekly_analyses")
        .select("id, severity, title, analysis, created_at")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(500);

      const items = (data as AiInsight[]) || [];
      setInsights(items);

      // Auto-select the most recent session
      if (items.length > 0) {
        setSelectedSession(items[0].created_at);
      } else {
        setSelectedSession(null);
      }
      setIsLoading(false);
    };
    fetch();
  }, [athleteId]);

  // Group by exact created_at ISO string → sessions
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
    const map: Record<SeverityKey, AiInsight[]> = {
      high: [],
      medium: [],
      low: [],
    };
    for (const i of sessionInsights) {
      const key = (i.severity as SeverityKey) || "low";
      if (map[key]) map[key].push(i);
    }
    return map;
  }, [sessionInsights]);

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
          <Skeleton className="h-24 w-full rounded-xl" />
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
            Yukarıdaki "🧠 AI Taraması" butonunu kullanarak ilk analizi
            başlatabilirsiniz.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
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

      <CardContent className="space-y-4">
        {/* 3 Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          {(["high", "medium", "low"] as SeverityKey[]).map((severity) => {
            const config = severityConfig[severity];
            const Icon = config.icon;
            const count = grouped[severity].length;

            return (
              <div
                key={severity}
                className={`rounded-xl border p-4 transition-all ${config.cardBg}`}
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <Icon className={`w-7 h-7 ${config.textColor}`} />
                  <span
                    className={`text-3xl font-black ${config.textColor}`}
                  >
                    {count}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${config.badgeCls}`}
                  >
                    {config.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail Cards */}
        <div className="space-y-3">
          {sessionInsights.map((insight) => {
            const sev = (insight.severity as SeverityKey) || "low";
            const config = severityConfig[sev];
            const Icon = config.icon;

            return (
              <div
                key={insight.id}
                className={`rounded-lg border border-border bg-card p-4 border-l-4 ${config.borderColor}`}
              >
                <div className="flex items-start gap-3">
                  <Icon
                    className={`w-5 h-5 mt-0.5 shrink-0 ${config.textColor}`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground mb-1">
                      {insight.title}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                      {insight.analysis}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

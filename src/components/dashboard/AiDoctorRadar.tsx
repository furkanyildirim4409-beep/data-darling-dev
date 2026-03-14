import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, AlertTriangle, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";

interface AiInsight {
  id: string;
  severity: string;
  title: string;
  analysis: string;
  athlete_name: string | null;
  created_at: string;
}

export function AiDoctorRadar() {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("ai_weekly_analyses")
        .select("*")
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(50);

      setInsights((data as any[]) || []);
      setIsLoading(false);
    };
    fetchInsights();
  }, []);

  const severityConfig = {
    high: {
      icon: AlertTriangle,
      color: "text-destructive",
      bg: "bg-destructive/10 border-destructive/30",
      badge: "bg-destructive/20 text-destructive border-destructive/30",
      label: "Kritik",
    },
    medium: {
      icon: AlertCircle,
      color: "text-warning",
      bg: "bg-warning/10 border-warning/30",
      badge: "bg-warning/20 text-warning border-warning/30",
      label: "Dikkat",
    },
    low: {
      icon: CheckCircle2,
      color: "text-success",
      bg: "bg-success/10 border-success/30",
      badge: "bg-success/20 text-success border-success/30",
      label: "Normal",
    },
  };

  const highCount = insights.filter((i) => i.severity === "high").length;
  const mediumCount = insights.filter((i) => i.severity === "medium").length;

  return (
    <Card className="glass border-border overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-foreground">
                AI Doktor & Performans Radarı
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Yapay zeka destekli holistik sporcu analizi
              </p>
            </div>
          </div>
          {!isLoading && insights.length > 0 && (
            <div className="flex items-center gap-2">
              {highCount > 0 && (
                <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30 text-xs">
                  {highCount} Kritik
                </Badge>
              )}
              {mediumCount > 0 && (
                <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30 text-xs">
                  {mediumCount} Dikkat
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">
              Henüz AI analizi bulunmuyor
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sporcu profilinden "Yapay Zeka Taraması" başlatabilirsiniz
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {insights.map((insight) => {
              const config = severityConfig[insight.severity as keyof typeof severityConfig] || severityConfig.low;
              const Icon = config.icon;
              return (
                <div
                  key={insight.id}
                  className={`rounded-lg border p-3 ${config.bg} transition-all hover:scale-[1.01]`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{insight.title}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.badge}`}>
                          {config.label}
                        </Badge>
                        {insight.athlete_name && (
                          <span className="text-[10px] text-muted-foreground">
                            • {insight.athlete_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {insight.analysis}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

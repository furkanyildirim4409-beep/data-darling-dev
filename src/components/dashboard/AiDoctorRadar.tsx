import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Brain, AlertTriangle, AlertCircle, CheckCircle2, Sparkles, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AiInsight {
  id: string;
  severity: string;
  title: string;
  analysis: string;
  athlete_id: string;
  athlete_name: string | null;
  created_at: string;
}

type SeverityKey = "high" | "medium" | "low";

export function AiDoctorRadar() {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityKey | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInsights = async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("ai_weekly_analyses")
        .select("*")
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(500);

      setInsights((data as any[]) || []);
      setIsLoading(false);
    };
    fetchInsights();
  }, []);

  // Deduplicate: keep only latest scan per athlete
  const latestInsights = useMemo(() => {
    const latestTimestampByAthlete = new Map<string, string>();
    for (const i of insights) {
      const existing = latestTimestampByAthlete.get(i.athlete_id);
      if (!existing || i.created_at > existing) {
        latestTimestampByAthlete.set(i.athlete_id, i.created_at);
      }
    }
    return insights.filter(
      (i) => i.created_at === latestTimestampByAthlete.get(i.athlete_id)
    );
  }, [insights]);

  const grouped = useMemo(() => {
    const map: Record<SeverityKey, AiInsight[]> = { high: [], medium: [], low: [] };
    for (const i of latestInsights) {
      const key = (i.severity as SeverityKey) || "low";
      if (map[key]) map[key].push(i);
    }
    return map;
  }, [latestInsights]);

  const severityConfig: Record<SeverityKey, {
    icon: typeof AlertTriangle;
    label: string;
    cardBg: string;
    textColor: string;
    badgeCls: string;
    ringColor: string;
  }> = {
    high: {
      icon: AlertTriangle,
      label: "Kritik",
      cardBg: "bg-destructive/10 border-destructive/30 hover:bg-destructive/15",
      textColor: "text-destructive",
      badgeCls: "bg-destructive/20 text-destructive border-destructive/30",
      ringColor: "ring-destructive/40",
    },
    medium: {
      icon: AlertCircle,
      label: "Dikkat",
      cardBg: "bg-warning/10 border-warning/30 hover:bg-warning/15",
      textColor: "text-warning",
      badgeCls: "bg-warning/20 text-warning border-warning/30",
      ringColor: "ring-warning/40",
    },
    low: {
      icon: CheckCircle2,
      label: "Olumlu",
      cardBg: "bg-success/10 border-success/30 hover:bg-success/15",
      textColor: "text-success",
      badgeCls: "bg-success/20 text-success border-success/30",
      ringColor: "ring-success/40",
    },
  };

  const dialogInsights = selectedSeverity ? grouped[selectedSeverity] : [];
  // Group dialog insights by athlete
  const athleteGroups = useMemo(() => {
    const map = new Map<string, { name: string; id: string; titles: string[] }>();
    for (const i of dialogInsights) {
      const existing = map.get(i.athlete_id);
      if (existing) {
        existing.titles.push(i.title);
      } else {
        map.set(i.athlete_id, {
          name: i.athlete_name || "İsimsiz",
          id: i.athlete_id,
          titles: [i.title],
        });
      }
    }
    return Array.from(map.values());
  }, [dialogInsights]);

  const getInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      <Card className="glass border-border overflow-hidden">
        <CardHeader className="pb-3">
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
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : latestInsights.length === 0 ? (
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
            <div className="grid grid-cols-3 gap-3">
              {(["high", "medium", "low"] as SeverityKey[]).map((severity) => {
                const config = severityConfig[severity];
                const Icon = config.icon;
                const count = grouped[severity].length;
                // Count unique athletes
                const uniqueAthletes = new Set(grouped[severity].map((i) => i.athlete_id)).size;

                return (
                  <button
                    key={severity}
                    onClick={() => count > 0 && setSelectedSeverity(severity)}
                    disabled={count === 0}
                    className={`rounded-xl border p-4 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default ${config.cardBg} ring-0 hover:ring-2 ${config.ringColor}`}
                  >
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Icon className={`w-7 h-7 ${config.textColor}`} />
                      <span className={`text-3xl font-black ${config.textColor}`}>{count}</span>
                      <Badge variant="outline" className={`text-xs ${config.badgeCls}`}>
                        {config.label}
                      </Badge>
                      {uniqueAthletes > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {uniqueAthletes} sporcu
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedSeverity} onOpenChange={() => setSelectedSeverity(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
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
                      {athleteGroups.length} sporcu
                    </Badge>
                  </>
                );
              })()}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {athleteGroups.map((athlete) => (
              <div
                key={athlete.id}
                className="rounded-lg border border-border bg-card p-3 space-y-2"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {getInitials(athlete.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{athlete.name}</p>
                    <div className="space-y-0.5 mt-1">
                      {athlete.titles.map((title, idx) => (
                        <p key={idx} className="text-xs text-muted-foreground leading-snug">
                          • {title}
                        </p>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => {
                      setSelectedSeverity(null);
                      navigate(`/athletes/${athlete.id}`);
                    }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Profili İncele</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

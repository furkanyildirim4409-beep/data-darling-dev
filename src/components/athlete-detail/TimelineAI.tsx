import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Clock,
  Loader2,
  Wand2,
  History,
  ChevronDown,
  ChevronUp,
  Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AiStatusLog {
  id: string;
  analysis_type: string | null;
  analysis_text: string;
  student_goal_snapshot: string | null;
  created_at: string;
}

interface TimelineAIProps {
  athleteId: string;
}

interface Stats {
  bodyFat: number;
  muscleMass: number;
  strength: number;
  endurance: number;
}

const fmt = (n: number, d = 1): string =>
  Number.isFinite(n) ? Number(n).toFixed(d) : "—";

const round1 = (n: number): number =>
  Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;

export function TimelineAI({ athleteId }: TimelineAIProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [startStats, setStartStats] = useState<Stats>({ bodyFat: 0, muscleMass: 0, strength: 0, endurance: 0 });
  const [currentStats, setCurrentStats] = useState<Stats>({ bodyFat: 0, muscleMass: 0, strength: 0, endurance: 0 });
  const [hasData, setHasData] = useState(false);
  const [forecast, setForecast] = useState<string | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [logs, setLogs] = useState<AiStatusLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    const { data, error } = await supabase
      .from("athlete_ai_status_logs")
      .select("id, analysis_type, analysis_text, student_goal_snapshot, created_at")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false });
    setLogsLoading(false);
    if (error) {
      toast.error(error.message || "AI geçmişi yüklenemedi");
      return;
    }
    setLogs((data ?? []) as AiStatusLog[]);
  }, [athleteId]);

  useEffect(() => {
    if (historyOpen) fetchLogs();
  }, [historyOpen, fetchLogs]);

  const fetchRealData = useCallback(async () => {
    setIsLoading(true);

    const [bodyRes, workoutRes] = await Promise.all([
      supabase
        .from("body_measurements")
        .select("body_fat_pct, muscle_mass_kg, logged_at")
        .eq("user_id", athleteId)
        .order("logged_at", { ascending: true }),
      supabase
        .from("workout_logs")
        .select("tonnage, duration_minutes, logged_at")
        .eq("user_id", athleteId)
        .order("logged_at", { ascending: true }),
    ]);

    const bodyData = bodyRes.data || [];
    const workoutData = workoutRes.data || [];

    if (bodyData.length === 0 && workoutData.length === 0) {
      setHasData(false);
      setIsLoading(false);
      return;
    }

    setHasData(true);

    const firstBody = bodyData[0];
    const latestBody = bodyData[bodyData.length - 1];

    const workoutCount = workoutData.length;
    const firstQuarter = workoutData.slice(0, Math.max(1, Math.floor(workoutCount / 4)));
    const lastQuarter = workoutData.slice(Math.max(0, workoutCount - Math.max(1, Math.floor(workoutCount / 4))));

    const avgTonnageFirst = firstQuarter.reduce((s, w) => s + Number(w.tonnage || 0), 0) / firstQuarter.length || 0;
    const avgTonnageLast = lastQuarter.reduce((s, w) => s + Number(w.tonnage || 0), 0) / lastQuarter.length || 0;
    const avgDurationFirst = firstQuarter.reduce((s, w) => s + Number(w.duration_minutes || 0), 0) / firstQuarter.length || 0;
    const avgDurationLast = lastQuarter.reduce((s, w) => s + Number(w.duration_minutes || 0), 0) / lastQuarter.length || 0;

    const maxTonnage = Math.max(avgTonnageFirst, avgTonnageLast, 1);
    const maxDuration = Math.max(avgDurationFirst, avgDurationLast, 1);

    setStartStats({
      bodyFat: round1(Number(firstBody?.body_fat_pct) || 25),
      muscleMass: round1(Number(firstBody?.muscle_mass_kg) || 65),
      strength: Math.round((avgTonnageFirst / maxTonnage) * 100) || 50,
      endurance: Math.round((avgDurationFirst / maxDuration) * 100) || 50,
    });

    setCurrentStats({
      bodyFat: round1(Number(latestBody?.body_fat_pct) || Number(firstBody?.body_fat_pct) || 25),
      muscleMass: round1(Number(latestBody?.muscle_mass_kg) || Number(firstBody?.muscle_mass_kg) || 65),
      strength: Math.round((avgTonnageLast / maxTonnage) * 100) || 50,
      endurance: Math.round((avgDurationLast / maxDuration) * 100) || 50,
    });

    setIsLoading(false);
  }, [athleteId]);

  useEffect(() => {
    fetchRealData();
  }, [fetchRealData]);

  const projections = {
    0: { label: "Şimdi", ...currentStats },
    1: {
      label: "1 Ay",
      bodyFat: round1(Math.max(currentStats.bodyFat - 1, 8)),
      muscleMass: round1(currentStats.muscleMass + 1),
      strength: Math.min(currentStats.strength + 3, 100),
      endurance: Math.min(currentStats.endurance + 3, 100),
    },
    3: {
      label: "3 Ay",
      bodyFat: round1(Math.max(currentStats.bodyFat - 3, 8)),
      muscleMass: round1(currentStats.muscleMass + 3),
      strength: Math.min(currentStats.strength + 8, 100),
      endurance: Math.min(currentStats.endurance + 8, 100),
    },
    6: {
      label: "6 Ay",
      bodyFat: round1(Math.max(currentStats.bodyFat - 5, 8)),
      muscleMass: round1(currentStats.muscleMass + 6),
      strength: Math.min(currentStats.strength + 13, 100),
      endurance: Math.min(currentStats.endurance + 15, 100),
    },
    12: {
      label: "1 Yıl",
      bodyFat: round1(Math.max(currentStats.bodyFat - 7, 6)),
      muscleMass: round1(currentStats.muscleMass + 10),
      strength: Math.min(currentStats.strength + 18, 100),
      endurance: Math.min(currentStats.endurance + 20, 100),
    },
  };

  const [selectedTime, setSelectedTime] = useState<keyof typeof projections>(0);
  const projection = projections[selectedTime];
  const current = projections[0];
  const timelineMarks = [0, 1, 3, 6, 12];

  const getClosestMark = (value: number): keyof typeof projections => {
    const closest = timelineMarks.reduce((prev, curr) =>
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );
    return closest as keyof typeof projections;
  };

  const renderStatChange = (label: string, currentVal: number, projected: number, unit: string, inverse = false) => {
    const change = round1(projected - currentVal);
    const isPositive = inverse ? change < 0 : change > 0;

    return (
      <div className="p-3 rounded-lg bg-secondary/50 border border-border overflow-hidden">
        <div className="flex items-center justify-between mb-1 gap-2">
          <span className="text-xs text-muted-foreground truncate">{label}</span>
          {change !== 0 && (
            <div className={cn("flex items-center gap-1 text-xs shrink-0", isPositive ? "text-success" : "text-destructive")}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {change > 0 ? "+" : ""}{fmt(change, 1)}{unit}
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-2 min-w-0">
          <span className={cn(
            "text-2xl font-bold font-mono tabular-nums truncate",
            selectedTime > 0 && change !== 0 ? (isPositive ? "text-success" : "text-destructive") : "text-foreground"
          )}>
            {fmt(projected, 1)}{unit}
          </span>
          {selectedTime > 0 && (
            <span className="text-xs text-muted-foreground line-through tabular-nums shrink-0">
              {fmt(currentVal, 1)}{unit}
            </span>
          )}
        </div>
      </div>
    );
  };

  const runForecast = async () => {
    setForecastLoading(true);
    setForecast(null);
    const { data, error } = await supabase.functions.invoke("timeline-forecast", {
      body: { athleteId },
    });
    setForecastLoading(false);
    if (error) {
      toast.error(error.message || "AI tahmini başarısız");
      return;
    }
    if ((data as any)?.error) {
      toast.error((data as any).error);
      return;
    }
    setForecast((data as any)?.markdown ?? "");
    fetchLogs();
  };

  if (isLoading) {
    return <Skeleton className="h-80 w-full rounded-xl" />;
  }

  if (!hasData) {
    return (
      <div className="glass rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Zaman Çizelgesi AI</h3>
        </div>
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground text-center">
          Öngörü için yeterli vücut ölçümü veya antrenman verisi bekleniyor.
        </div>
      </div>
    );
  }

  const bodyFatDelta = round1(startStats.bodyFat - currentStats.bodyFat);
  const muscleDelta = round1(currentStats.muscleMass - startStats.muscleMass);
  const bodyFatProgress = startStats.bodyFat > 0
    ? round1((bodyFatDelta / startStats.bodyFat) * 100)
    : 0;
  const muscleProgress = startStats.muscleMass > 0
    ? round1((muscleDelta / startStats.muscleMass) * 100)
    : 0;

  return (
    <div className="glass rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Zaman Çizelgesi AI</h3>
            <p className="text-xs text-muted-foreground">Gerçek veri tabanlı öngörü</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          <Clock className="w-3 h-3 mr-1" />
          {projection.label}
        </Badge>
      </div>

      <div className="mb-4 p-3 rounded-lg bg-success/5 border border-success/20">
        <p className="text-xs font-medium text-success mb-2">Başlangıçtan Bu Yana</p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground shrink-0">Yağ Kaybı:</span>
            <span className="font-mono text-success tabular-nums truncate">
              <TrendingDown className="w-3 h-3 inline mr-1" />
              {fmt(bodyFatDelta, 1)}% ({fmt(bodyFatProgress, 1)}%)
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground shrink-0">Kas Artışı:</span>
            <span className="font-mono text-success tabular-nums truncate">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +{fmt(muscleDelta, 1)}kg ({fmt(muscleProgress, 1)}%)
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          {timelineMarks.map((mark) => (
            <span
              key={mark}
              className={cn(
                "cursor-pointer transition-colors",
                selectedTime === mark && "text-primary font-medium"
              )}
              onClick={() => setSelectedTime(mark as keyof typeof projections)}
            >
              {projections[mark as keyof typeof projections].label}
            </span>
          ))}
        </div>
        <Slider
          value={[selectedTime]}
          onValueChange={([v]) => setSelectedTime(getClosestMark(v))}
          min={0}
          max={12}
          step={1}
          className="cursor-pointer"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {renderStatChange("Vücut Yağı", current.bodyFat, projection.bodyFat, "%", true)}
        {renderStatChange("Kas Kütlesi", current.muscleMass, projection.muscleMass, "kg")}
        {renderStatChange("Güç İndeksi", current.strength, projection.strength, "")}
        {renderStatChange("Dayanıklılık", current.endurance, projection.endurance, "")}
      </div>

      {selectedTime > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">AI Güven Oranı</span>
            <span className="font-mono text-primary tabular-nums">
              %{Math.max(95 - selectedTime * 5, 70)}
            </span>
          </div>
          <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.max(95 - selectedTime * 5, 70)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Gerçek ölçüm verilerine ve antrenman geçmişine dayanarak
          </p>
        </div>
      )}

      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <Button
            onClick={runForecast}
            disabled={forecastLoading}
            variant="outline"
            size="sm"
            className="border-primary/30 hover:bg-primary/10"
          >
            {forecastLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                AI 4-Haftalık Tahmin Üretiyor...
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5 mr-2" />
                AI Holistik Tahmin Üret
              </>
            )}
          </Button>
          <Button
            onClick={() => setHistoryOpen(true)}
            variant="outline"
            size="sm"
            className="border-white/10 bg-background/40 hover:bg-background/60 text-foreground"
          >
            <History className="w-3.5 h-3.5 mr-2" />
            AI Durum Analizi
          </Button>
        </div>

        {forecast && (
          <div className="p-4 rounded-lg bg-background/60 border border-primary/20 max-h-96 overflow-y-auto">
            <div className="prose prose-sm prose-invert max-w-none text-xs whitespace-pre-wrap leading-relaxed text-foreground">
              {forecast}
            </div>
          </div>
        )}
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl bg-background/95 backdrop-blur-xl border border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <History className="w-5 h-5 text-primary" />
              AI Durum Analizi Geçmişi
            </DialogTitle>
            <DialogDescription>
              {logsLoading
                ? "Yükleniyor..."
                : `Toplam ${logs.length} kayıtlı AI holistik analiz raporu.`}
            </DialogDescription>
          </DialogHeader>

          {logsLoading ? (
            <div className="py-10 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Henüz kayıtlı AI analizi yok. "AI Holistik Tahmin Üret" butonunu kullanın.
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto scrollbar-hide space-y-3 pr-1">
              {logs.map((log) => {
                const isExpanded = expandedId === log.id;
                const preview =
                  log.analysis_text.length > 220 && !isExpanded
                    ? log.analysis_text.slice(0, 220) + "…"
                    : log.analysis_text;
                const dateLabel = new Date(log.created_at).toLocaleString("tr-TR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div
                    key={log.id}
                    className="rounded-xl border border-white/10 bg-background/50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {dateLabel}
                      </div>
                      {log.student_goal_snapshot && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                          <Target className="w-3 h-3" />
                          {log.student_goal_snapshot}
                        </span>
                      )}
                    </div>
                    <div className="text-xs whitespace-pre-wrap leading-relaxed text-foreground/90">
                      {preview}
                    </div>
                    {log.analysis_text.length > 220 && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3 h-3" /> Daralt
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3" /> Tamamını gör
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

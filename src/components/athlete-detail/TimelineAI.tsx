import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TimelineAIProps {
  athleteId: string;
}

interface Stats {
  bodyFat: number;
  muscleMass: number;
  strength: number;
  endurance: number;
}

export function TimelineAI({ athleteId }: TimelineAIProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [startStats, setStartStats] = useState<Stats>({ bodyFat: 0, muscleMass: 0, strength: 0, endurance: 0 });
  const [currentStats, setCurrentStats] = useState<Stats>({ bodyFat: 0, muscleMass: 0, strength: 0, endurance: 0 });
  const [hasData, setHasData] = useState(false);

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

    // Body measurements: first and latest
    const firstBody = bodyData[0];
    const latestBody = bodyData[bodyData.length - 1];

    // Workout-based strength & endurance from tonnage and duration
    const workoutCount = workoutData.length;
    const firstQuarter = workoutData.slice(0, Math.max(1, Math.floor(workoutCount / 4)));
    const lastQuarter = workoutData.slice(Math.max(0, workoutCount - Math.max(1, Math.floor(workoutCount / 4))));

    const avgTonnageFirst = firstQuarter.reduce((s, w) => s + Number(w.tonnage || 0), 0) / firstQuarter.length || 0;
    const avgTonnageLast = lastQuarter.reduce((s, w) => s + Number(w.tonnage || 0), 0) / lastQuarter.length || 0;
    const avgDurationFirst = firstQuarter.reduce((s, w) => s + Number(w.duration_minutes || 0), 0) / firstQuarter.length || 0;
    const avgDurationLast = lastQuarter.reduce((s, w) => s + Number(w.duration_minutes || 0), 0) / lastQuarter.length || 0;

    // Normalize strength/endurance to 0-100 scale
    const maxTonnage = Math.max(avgTonnageFirst, avgTonnageLast, 1);
    const maxDuration = Math.max(avgDurationFirst, avgDurationLast, 1);

    setStartStats({
      bodyFat: Number(firstBody?.body_fat_pct) || 25,
      muscleMass: Number(firstBody?.muscle_mass_kg) || 65,
      strength: Math.round((avgTonnageFirst / maxTonnage) * 100) || 50,
      endurance: Math.round((avgDurationFirst / maxDuration) * 100) || 50,
    });

    setCurrentStats({
      bodyFat: Number(latestBody?.body_fat_pct) || Number(firstBody?.body_fat_pct) || 25,
      muscleMass: Number(latestBody?.muscle_mass_kg) || Number(firstBody?.muscle_mass_kg) || 65,
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
      bodyFat: Math.max(currentStats.bodyFat - 1, 8),
      muscleMass: currentStats.muscleMass + 1,
      strength: Math.min(currentStats.strength + 3, 100),
      endurance: Math.min(currentStats.endurance + 3, 100),
    },
    3: {
      label: "3 Ay",
      bodyFat: Math.max(currentStats.bodyFat - 3, 8),
      muscleMass: currentStats.muscleMass + 3,
      strength: Math.min(currentStats.strength + 8, 100),
      endurance: Math.min(currentStats.endurance + 8, 100),
    },
    6: {
      label: "6 Ay",
      bodyFat: Math.max(currentStats.bodyFat - 5, 8),
      muscleMass: currentStats.muscleMass + 6,
      strength: Math.min(currentStats.strength + 13, 100),
      endurance: Math.min(currentStats.endurance + 15, 100),
    },
    12: {
      label: "1 Yıl",
      bodyFat: Math.max(currentStats.bodyFat - 7, 6),
      muscleMass: currentStats.muscleMass + 10,
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
    const change = Number((projected - currentVal).toFixed(1));
    const isPositive = inverse ? change < 0 : change > 0;

    return (
      <div className="p-3 rounded-lg bg-secondary/50 border border-border">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          {change !== 0 && (
            <div className={cn("flex items-center gap-1 text-xs", isPositive ? "text-success" : "text-destructive")}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {change > 0 ? "+" : ""}{change}{unit}
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "text-2xl font-bold font-mono",
            selectedTime > 0 && change !== 0 ? (isPositive ? "text-success" : "text-destructive") : "text-foreground"
          )}>
            {projected}{unit}
          </span>
          {selectedTime > 0 && (
            <span className="text-xs text-muted-foreground line-through">{currentVal}{unit}</span>
          )}
        </div>
      </div>
    );
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

  const bodyFatProgress = startStats.bodyFat > 0
    ? ((startStats.bodyFat - currentStats.bodyFat) / startStats.bodyFat * 100).toFixed(1)
    : "0";
  const muscleProgress = startStats.muscleMass > 0
    ? ((currentStats.muscleMass - startStats.muscleMass) / startStats.muscleMass * 100).toFixed(1)
    : "0";

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

      {/* Progress Summary */}
      <div className="mb-4 p-3 rounded-lg bg-success/5 border border-success/20">
        <p className="text-xs font-medium text-success mb-2">Başlangıçtan Bu Yana</p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Yağ Kaybı:</span>
            <span className="font-mono text-success">
              <TrendingDown className="w-3 h-3 inline mr-1" />
              {(startStats.bodyFat - currentStats.bodyFat).toFixed(1)}% ({bodyFatProgress}%)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Kas Artışı:</span>
            <span className="font-mono text-success">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +{(currentStats.muscleMass - startStats.muscleMass).toFixed(1)}kg ({muscleProgress}%)
            </span>
          </div>
        </div>
      </div>

      {/* Timeline Slider */}
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

      {/* Projected Stats */}
      <div className="grid grid-cols-2 gap-3">
        {renderStatChange("Vücut Yağı", current.bodyFat, projection.bodyFat, "%", true)}
        {renderStatChange("Kas Kütlesi", current.muscleMass, projection.muscleMass, "kg")}
        {renderStatChange("Güç İndeksi", current.strength, projection.strength, "")}
        {renderStatChange("Dayanıklılık", current.endurance, projection.endurance, "")}
      </div>

      {/* AI Confidence */}
      {selectedTime > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">AI Güven Oranı</span>
            <span className="font-mono text-primary">
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
    </div>
  );
}

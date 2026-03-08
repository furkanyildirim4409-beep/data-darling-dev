import { useState } from "react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, TrendingDown, Clock } from "lucide-react";

interface TimelineAIProps {
  currentStats: {
    bodyFat: number;
    muscleMass: number;
    strength: number;
    endurance: number;
  };
  startStats?: {
    bodyFat: number;
    muscleMass: number;
    strength: number;
    endurance: number;
  };
}

export function TimelineAI({ currentStats, startStats }: TimelineAIProps) {
  // Use provided start stats or default values that make sense with current stats
  const defaultStartStats = {
    bodyFat: 22, // Started higher, now at 18 (trending down - good)
    muscleMass: 70, // Started lower, now at 75 (trending up - good)
    strength: 65, // Started lower, now at 82 (trending up - good)
    endurance: 55, // Started lower, now at 70 (trending up - good)
  };

  const start = startStats || defaultStartStats;

  // Projections based on CURRENT stats, projecting forward
  // Body fat continues to decrease, muscle/strength/endurance increase
  const projections = {
    0: { label: "Şimdi", ...currentStats },
    1: { 
      label: "1 Ay", 
      bodyFat: Math.max(currentStats.bodyFat - 1, 10), 
      muscleMass: currentStats.muscleMass + 1, 
      strength: currentStats.strength + 3, 
      endurance: currentStats.endurance + 3 
    },
    3: { 
      label: "3 Ay", 
      bodyFat: Math.max(currentStats.bodyFat - 3, 10), 
      muscleMass: currentStats.muscleMass + 3, 
      strength: currentStats.strength + 8, 
      endurance: currentStats.endurance + 8 
    },
    6: { 
      label: "6 Ay", 
      bodyFat: Math.max(currentStats.bodyFat - 6, 10), 
      muscleMass: currentStats.muscleMass + 7, 
      strength: currentStats.strength + 13, 
      endurance: currentStats.endurance + 15 
    },
    12: { 
      label: "1 Yıl", 
      bodyFat: Math.max(currentStats.bodyFat - 8, 8), 
      muscleMass: currentStats.muscleMass + 10, 
      strength: Math.min(currentStats.strength + 18, 100), 
      endurance: Math.min(currentStats.endurance + 20, 100) 
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

  const renderStatChange = (label: string, current: number, projected: number, unit: string, inverse = false) => {
    const change = projected - current;
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
            <span className="text-xs text-muted-foreground line-through">{current}{unit}</span>
          )}
        </div>
      </div>
    );
  };

  // Calculate progress from start to current
  const bodyFatProgress = ((start.bodyFat - currentStats.bodyFat) / start.bodyFat * 100).toFixed(1);
  const muscleProgress = ((currentStats.muscleMass - start.muscleMass) / start.muscleMass * 100).toFixed(1);

  return (
    <div className="glass rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Zaman Çizelgesi AI</h3>
            <p className="text-xs text-muted-foreground">Öngörücü analitik</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          <Clock className="w-3 h-3 mr-1" />
          {projection.label}
        </Badge>
      </div>

      {/* Progress Summary - Start vs Current */}
      <div className="mb-4 p-3 rounded-lg bg-success/5 border border-success/20">
        <p className="text-xs font-medium text-success mb-2">Başlangıçtan Bu Yana</p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Yağ Kaybı:</span>
            <span className="font-mono text-success">
              <TrendingDown className="w-3 h-3 inline mr-1" />
              {start.bodyFat - currentStats.bodyFat}% ({bodyFatProgress}%)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Kas Artışı:</span>
            <span className="font-mono text-success">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +{currentStats.muscleMass - start.muscleMass}kg ({muscleProgress}%)
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
            Mevcut gidişat ve %94 program uyumuna dayanarak
          </p>
        </div>
      )}
    </div>
  );
}

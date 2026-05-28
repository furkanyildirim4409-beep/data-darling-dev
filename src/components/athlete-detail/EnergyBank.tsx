import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  BatteryWarning,
  MoreVertical,
  TrendingUp,
  CalendarDays,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface EnergyBankProps {
  athleteId: string;
}

interface CheckIn {
  mood: number | null;
  sleep_hours: number | null;
  soreness: number | null;
  stress: number | null;
  digestion: number | null;
  created_at: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function computeEnergy(c: CheckIn | null): number {
  if (!c) return 0;
  const mood = c.mood ?? 3;
  const soreness = 6 - (c.soreness ?? 3);
  const stress = 6 - (c.stress ?? 3);
  const digestion = c.digestion ?? 3;
  const sleep = Math.min(c.sleep_hours ?? 6, 8) / 8 * 5;
  const avg = (mood + soreness + stress + digestion + sleep) / 5;
  return Math.max(0, Math.min(100, Math.round(((avg - 1) / 4) * 100)));
}

// Mirrors applyDecay() in src/hooks/useAthletes.ts so the EnergyBank value
// matches the "Hazırlık" (readiness) score on the athlete roster page.
function applyReadinessDecay(base: number, lastActivityIso: string | null): number {
  if (!lastActivityIso) return 0;
  const elapsedDays = Math.floor((Date.now() - new Date(lastActivityIso).getTime()) / DAY_MS);
  if (elapsedDays >= 14) return 0;
  if (elapsedDays > 3) return Math.max(0, base - (elapsedDays - 3) * 10);
  return base;
}

export function EnergyBank({ athleteId }: EnergyBankProps) {
  const [baseReadiness, setBaseReadiness] = useState<number>(75);
  const [lastActivityIso, setLastActivityIso] = useState<string | null>(null);
  const [history, setHistory] = useState<CheckIn[]>([]);
  const [open, setOpen] = useState(false);

  const percentage = applyReadinessDecay(baseReadiness, lastActivityIso);
  const isStale = percentage === 0;

  useEffect(() => {
    if (!athleteId) return;
    let cancelled = false;

    const fetchData = async () => {
      const [profileRes, checkinsRes, workoutsRes] = await Promise.all([
        supabase.from("profiles").select("readiness_score").eq("id", athleteId).maybeSingle(),
        supabase
          .from("daily_checkins")
          .select("mood, sleep_hours, soreness, stress, digestion, created_at")
          .eq("user_id", athleteId)
          .order("created_at", { ascending: false })
          .limit(14),
        supabase
          .from("workout_logs")
          .select("logged_at")
          .eq("user_id", athleteId)
          .order("logged_at", { ascending: false })
          .limit(1),
      ]);
      if (cancelled) return;

      setBaseReadiness((profileRes.data as any)?.readiness_score ?? 75);

      const rows = (checkinsRes.data ?? []) as CheckIn[];
      setHistory(rows);

      const lastCheckin = rows[0]?.created_at ?? null;
      const lastWorkout = (workoutsRes.data?.[0] as any)?.logged_at ?? null;
      const latest =
        lastCheckin && lastWorkout
          ? lastCheckin > lastWorkout ? lastCheckin : lastWorkout
          : lastCheckin ?? lastWorkout ?? null;
      setLastActivityIso(latest);
    };

    fetchData();

    const channel = supabase.channel(`energy-bank-${athleteId}`);
    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "daily_checkins", filter: `user_id=eq.${athleteId}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "workout_logs", filter: `user_id=eq.${athleteId}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${athleteId}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [athleteId]);

  const Icon = useMemo(() => {
    if (isStale) return BatteryWarning;
    if (percentage >= 80) return BatteryFull;
    if (percentage >= 50) return BatteryMedium;
    if (percentage >= 20) return BatteryLow;
    return BatteryWarning;
  }, [percentage, isStale]);

  const colorClass = isStale
    ? "text-destructive"
    : percentage >= 80
    ? "text-success"
    : percentage >= 50
    ? "text-primary"
    : percentage >= 20
    ? "text-warning"
    : "text-destructive";

  const chartData = useMemo(
    () =>
      [...history]
        .reverse()
        .map((c) => ({
          date: new Date(c.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" }),
          energy: computeEnergy(c),
          mood: c.mood,
          stress: c.stress,
          sleep: c.sleep_hours,
        })),
    [history]
  );

  return (
    <>
      <div className="glass rounded-xl border border-border p-4 pr-12 flex items-center gap-4 relative min-w-[220px]">
        <div className={cn("relative shrink-0", colorClass)}>
          <Icon className={cn("w-12 h-12", isStale && "animate-pulse")} />
          {!isStale && percentage >= 80 && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ filter: "drop-shadow(0 0 8px currentColor)" }}
            >
              <Icon className="w-12 h-12 opacity-50" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wider truncate">Enerji Bankası</p>
          <p className={cn("text-2xl font-bold font-mono", colorClass)}>%{percentage}</p>
          {isStale && (
            <p className="text-[10px] text-destructive/80 uppercase tracking-wider">Check-in atlandı</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="absolute top-3 right-3 inline-flex items-center justify-center w-7 h-7 rounded-lg border border-white/5 bg-white/[0.02] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/40"
              aria-label="Seçenekler"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass border-border">
            <DropdownMenuItem onClick={() => setOpen(true)} className="gap-2 cursor-pointer">
              <TrendingUp className="w-4 h-4" />
              Geçmişi Görüntüle
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass border-border max-w-3xl backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Zap className="w-5 h-5 text-primary" />
              Enerji Rezervi & Davranış Geçmişi
            </DialogTitle>
            <DialogDescription>
              Son {history.length} check-in kaydından türetilmiş günlük enerji skoru.
            </DialogDescription>
          </DialogHeader>

          {chartData.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              Henüz check-in verisi yok.
            </div>
          ) : (
            <>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="energy"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "hsl(var(--primary))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="max-h-48 overflow-y-auto scrollbar-hide space-y-2 mt-2">
                {history.map((c, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span className="font-mono">
                        {new Date(c.created_at).toLocaleString("tr-TR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span
                        title={`Enerji Skoru: %${computeEnergy(c)}`}
                        className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono cursor-help"
                      >
                        ⚡ {computeEnergy(c)}%
                      </span>
                      <span
                        title={`Ruh Hali (1-5): ${c.mood ?? "veri yok"}`}
                        className="px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-mono cursor-help"
                      >
                        😊 {c.mood ?? "—"}
                      </span>
                      <span
                        title={`Uyku Süresi: ${c.sleep_hours ?? "veri yok"} saat`}
                        className="px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-mono cursor-help"
                      >
                        💤 {c.sleep_hours ?? "—"}s
                      </span>
                      <span
                        title={`Stres Seviyesi (1-5, düşük iyi): ${c.stress ?? "veri yok"}`}
                        className="px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-mono cursor-help"
                      >
                        😰 {c.stress ?? "—"}
                      </span>
                      <span
                        title={`Kas Ağrısı (1-5, düşük iyi): ${c.soreness ?? "veri yok"}`}
                        className="px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-mono cursor-help"
                      >
                        💪 {c.soreness ?? "—"}
                      </span>
                      <span
                        title={`Sindirim (1-5, yüksek iyi): ${c.digestion ?? "veri yok"}`}
                        className="px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-mono cursor-help"
                      >
                        🍽️ {c.digestion ?? "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

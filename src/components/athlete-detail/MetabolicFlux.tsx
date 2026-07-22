import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Flame, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Props {
  athleteId: string;
}

interface DayPoint {
  day: string;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  target: number;
}

interface NutritionLog {
  logged_at: string | null;
  total_calories: number | null;
  total_protein: number | null;
  total_carbs: number | null;
  total_fat: number | null;
}

const DAYS = 7;

function dayKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    const p = payload[0].payload as DayPoint;
    return (
      <div className="glass border border-border rounded-lg px-3 py-2 text-sm">
        <p className="font-medium text-foreground mb-1">{label}</p>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <Utensils className="w-3 h-3 text-success" />
            <span className="text-muted-foreground">Alım:</span>
            <span className="font-mono text-foreground">{p.calories} kcal</span>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="w-3 h-3 text-destructive" />
            <span className="text-muted-foreground">Hedef:</span>
            <span className="font-mono text-foreground">{p.target || "-"} kcal</span>
          </div>
          <div className="pt-1 border-t border-border text-[11px] text-muted-foreground">
            P {p.protein}g · K {p.carbs}g · Y {p.fat}g
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function MetabolicFlux({ athleteId }: Props) {
  const [data, setData] = useState<DayPoint[]>([]);
  const [target, setTarget] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (DAYS - 1));

    const [logsRes, targetRes] = await Promise.all([
      supabase
        .from("nutrition_logs")
        .select("logged_at,total_calories,total_protein,total_carbs,total_fat")
        .eq("user_id", athleteId)
        .gte("logged_at", start.toISOString()),
      supabase
        .from("nutrition_targets")
        .select("daily_calories")
        .eq("athlete_id", athleteId)
        .maybeSingle(),
    ]);

    const dailyTarget = targetRes.data?.daily_calories ?? 0;
    setTarget(dailyTarget);

    const buckets = new Map<string, DayPoint>();
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const k = dayKey(d);
      buckets.set(k, {
        day: k,
        label: d.toLocaleDateString("tr-TR", { weekday: "short", day: "2-digit" }),
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        target: dailyTarget,
      });
    }

    for (const row of (logsRes.data ?? []) as NutritionLog[]) {
      if (!row.logged_at) continue;
      const k = dayKey(new Date(row.logged_at));
      const b = buckets.get(k);
      if (!b) continue;
      b.calories += Math.round(row.total_calories ?? 0);
      b.protein += Math.round(row.total_protein ?? 0);
      b.carbs += Math.round(row.total_carbs ?? 0);
      b.fat += Math.round(row.total_fat ?? 0);
    }

    setData(Array.from(buckets.values()));
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchAll();
    const ch = supabase
      .channel(`mflux-${athleteId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "nutrition_logs", filter: `user_id=eq.${athleteId}` },
        () => fetchAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "nutrition_targets", filter: `athlete_id=eq.${athleteId}` },
        () => fetchAll()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  const today = data[data.length - 1];
  const todayCal = today?.calories ?? 0;
  const todayProtein = today?.protein ?? 0;
  const delta = target > 0 ? todayCal - target : 0;

  // Compliance: % of days within 85–115% of target
  const compliance =
    target > 0 && data.length > 0
      ? Math.round(
          (data.filter((d) => {
            const r = d.calories / target;
            return r >= 0.85 && r <= 1.15;
          }).length /
            data.length) *
            100
        )
      : 0;

  return (
    <div className="glass rounded-xl border border-border p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Metabolik Akış</h3>
          <p className="text-xs text-muted-foreground">Son 7 gün — gerçek beslenme logları</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-success/70" />
            <span className="text-muted-foreground">Alım</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-destructive/70" />
            <span className="text-muted-foreground">Hedef</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
          <p className="text-[10px] text-muted-foreground">Bugün Kalori</p>
          <p className="text-xl font-bold font-mono text-success">{todayCal}</p>
          <p className="text-[10px] text-muted-foreground">Hedef {target || "-"}</p>
        </div>
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
          <p className="text-[10px] text-muted-foreground">Delta</p>
          <p
            className={`text-xl font-bold font-mono ${
              delta === 0 ? "text-muted-foreground" : delta > 0 ? "text-warning" : "text-primary"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta}
          </p>
          <p className="text-[10px] text-muted-foreground">Protein {todayProtein}g</p>
        </div>
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-center">
          <p className="text-[10px] text-muted-foreground">Uyum (7g)</p>
          <p className="text-xl font-bold font-mono text-warning">{compliance}%</p>
          <p className="text-[10px] text-muted-foreground">85–115% bandı</p>
        </div>
      </div>

      <div className="h-48">
        {loading ? (
          <div className="h-full animate-pulse bg-secondary/30 rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIntake" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              {target > 0 && (
                <ReferenceLine
                  y={target}
                  stroke="hsl(0, 84%, 60%)"
                  strokeDasharray="4 4"
                  opacity={0.7}
                />
              )}
              <Area
                type="monotone"
                dataKey="calories"
                stroke="hsl(142, 76%, 36%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorIntake)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

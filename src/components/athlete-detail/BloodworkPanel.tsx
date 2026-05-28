import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, ExternalLink, Droplets } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BloodworkDialog } from "./BloodworkDialog";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface BloodworkPanelProps {
  athleteId: string;
}

interface Biomarker {
  name: string;
  value: number;
  unit: string;
  range: string;
  status: string;
}

interface BloodTest {
  id: string;
  date: string;
  file_name: string;
  document_url: string;
  status: string;
  coach_notes: string | null;
  extracted_data: Biomarker[] | null;
}

const CHART_COLORS = [
  "hsl(68, 100%, 50%)",
  "hsl(45, 100%, 50%)",
  "hsl(190, 90%, 55%)",
  "hsl(320, 80%, 60%)",
];

const statusColor = (status: string) => {
  switch (status) {
    case "optimal":
      return { bg: "bg-success/10", border: "border-success/20", text: "text-success" };
    case "warning":
      return { bg: "bg-warning/10", border: "border-warning/20", text: "text-warning" };
    case "low":
    case "high":
      return { bg: "bg-destructive/10", border: "border-destructive/20", text: "text-destructive" };
    default:
      return { bg: "bg-secondary/40", border: "border-border", text: "text-foreground" };
  }
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass border border-border rounded-lg px-3 py-2 text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      <div className="space-y-0.5">
        {payload.map((p: any) => (
          p?.value != null && (
            <p key={p.dataKey} className="font-mono" style={{ color: p.color }}>
              {p.dataKey}: {p.value}
            </p>
          )
        ))}
      </div>
    </div>
  );
};

export function BloodworkPanel({ athleteId }: BloodworkPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ["blood-tests", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_tests")
        .select("*")
        .eq("user_id", athleteId)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as BloodTest[];
    },
    enabled: !!athleteId,
  });

  // Latest test biomarkers (only ones with real values)
  const { latest, availableBiomarkers, chartMarkers, chartData } = useMemo(() => {
    if (tests.length === 0) {
      return { latest: null, availableBiomarkers: [], chartMarkers: [] as string[], chartData: [] as any[] };
    }
    const latest = tests[tests.length - 1];
    const latestBio = Array.isArray(latest.extracted_data) ? latest.extracted_data : [];
    const availableBiomarkers = latestBio.filter(
      (b) => b && b.value !== null && b.value !== undefined && Number.isFinite(Number(b.value))
    );

    // Markers present in ≥2 tests
    const nameCounts = new Map<string, { count: number; name: string }>();
    for (const t of tests) {
      const arr = Array.isArray(t.extracted_data) ? t.extracted_data : [];
      const seen = new Set<string>();
      for (const b of arr) {
        if (!b || b.value === null || b.value === undefined) continue;
        const key = b.name.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const entry = nameCounts.get(key);
        if (entry) entry.count += 1;
        else nameCounts.set(key, { count: 1, name: b.name });
      }
    }
    const chartMarkers = Array.from(nameCounts.values())
      .filter((e) => e.count >= 2)
      .slice(0, 4)
      .map((e) => e.name);

    const chartData = tests.map((t) => {
      const arr = Array.isArray(t.extracted_data) ? t.extracted_data : [];
      const row: Record<string, number | string | null> = {
        month: format(new Date(t.date), "MMM yy", { locale: tr }),
      };
      for (const m of chartMarkers) {
        const found = arr.find((b) => b?.name?.toLowerCase() === m.toLowerCase());
        row[m] = found && found.value !== null && found.value !== undefined ? Number(found.value) : null;
      }
      return row;
    });

    return { latest, availableBiomarkers, chartMarkers, chartData };
  }, [tests]);

  if (!isLoading && tests.length === 0) {
    return (
      <div className="glass rounded-xl border border-border p-5 flex flex-col items-center justify-center min-h-[200px] text-center">
        <Droplets className="w-10 h-10 text-muted-foreground mb-3" />
        <h3 className="text-sm font-semibold text-foreground">Kan Tahlili Yok</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Bu sporcu henüz kan tahlili yüklememiş.
        </p>
      </div>
    );
  }

  if (isLoading || !latest) {
    return (
      <div className="glass rounded-xl border border-border p-5 animate-pulse min-h-[200px]">
        <div className="h-4 bg-muted rounded w-1/3 mb-4" />
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  // Previous test for delta on quick-stat tiles
  const previous = tests.length >= 2 ? tests[tests.length - 2] : null;
  const prevBio = previous && Array.isArray(previous.extracted_data) ? previous.extracted_data : [];

  const tiles = availableBiomarkers.slice(0, 4);
  const lastDate = format(new Date(latest.date), "dd MMM yyyy", { locale: tr });

  return (
    <>
      <div
        className="glass rounded-xl border border-border p-5 cursor-pointer hover:border-primary/30 transition-all group"
        onClick={() => setDialogOpen(true)}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Kan Tahlili Paneli</h3>
            <p className="text-xs text-muted-foreground">
              {availableBiomarkers.length} biyobelirteç • Son tahlil {lastDate}
            </p>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>

        {tiles.length === 0 ? (
          <div className="p-4 rounded-lg bg-secondary/40 text-center text-xs text-muted-foreground">
            Bu tahlilden çıkarılmış sayısal biyobelirteç bulunmuyor.
          </div>
        ) : (
          <div className={cn(
            "grid gap-3 mb-4",
            tiles.length === 1 ? "grid-cols-1" : "grid-cols-2"
          )}>
            {tiles.map((marker) => {
              const style = statusColor(marker.status);
              const prev = prevBio.find(
                (p) => p?.name?.toLowerCase() === marker.name.toLowerCase()
              );
              const delta =
                prev && Number(prev.value) !== 0 && prev.value !== null && prev.value !== undefined
                  ? ((Number(marker.value) - Number(prev.value)) / Number(prev.value)) * 100
                  : null;
              return (
                <div
                  key={marker.name}
                  className={cn("p-3 rounded-lg border", style.bg, style.border)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground truncate pr-2">{marker.name}</span>
                    {delta !== null && Number.isFinite(delta) && (
                      <div className="flex items-center gap-1 text-xs shrink-0">
                        {delta > 0 ? (
                          <TrendingUp className="w-3 h-3 text-success" />
                        ) : delta < 0 ? (
                          <TrendingDown className="w-3 h-3 text-destructive" />
                        ) : null}
                        <span className={delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground"}>
                          %{delta.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className={cn("text-xl font-bold font-mono tabular-nums mt-1 truncate", style.text)}>
                    {marker.value} <span className="text-xs text-muted-foreground">{marker.unit}</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {chartMarkers.length > 0 && chartData.length > 1 && (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                {chartMarkers.map((m, i) => (
                  <Line
                    key={m}
                    type="monotone"
                    dataKey={m}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS[i % CHART_COLORS.length], strokeWidth: 0, r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground mt-2 group-hover:text-primary transition-colors">
          Detaylar için tıklayın
        </p>
      </div>

      <BloodworkDialog open={dialogOpen} onOpenChange={setDialogOpen} athleteId={athleteId} />
    </>
  );
}

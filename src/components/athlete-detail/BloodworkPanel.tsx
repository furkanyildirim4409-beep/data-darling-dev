import { useState } from "react";
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

function findBiomarker(biomarkers: Biomarker[] | null, keyword: string): number | null {
  if (!biomarkers || !Array.isArray(biomarkers)) return null;
  const found = biomarkers.find((b) =>
    b.name.toLowerCase().includes(keyword.toLowerCase())
  );
  return found ? found.value : null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass border border-border rounded-lg px-3 py-2 text-sm">
        <p className="font-medium text-foreground mb-1">{label}</p>
        <div className="space-y-1">
          {payload[0]?.value != null && (
            <p className="text-primary font-mono">T: {payload[0].value} ng/dL</p>
          )}
          {payload[1]?.value != null && (
            <p className="text-warning font-mono">C: {payload[1].value} μg/dL</p>
          )}
        </div>
      </div>
    );
  }
  return null;
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

  // No data state
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

  if (isLoading) {
    return (
      <div className="glass rounded-xl border border-border p-5 animate-pulse min-h-[200px]">
        <div className="h-4 bg-muted rounded w-1/3 mb-4" />
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  // Build chart data from all tests
  const chartData = tests.map((t) => {
    const biomarkers = Array.isArray(t.extracted_data) ? t.extracted_data : [];
    return {
      month: format(new Date(t.date), "MMM yy", { locale: tr }),
      testosterone: findBiomarker(biomarkers, "testosteron") ?? findBiomarker(biomarkers, "testosterone"),
      cortisol: findBiomarker(biomarkers, "kortizol") ?? findBiomarker(biomarkers, "cortisol"),
    };
  });

  // Latest two for trend
  const latest = tests[tests.length - 1];
  const previous = tests.length >= 2 ? tests[tests.length - 2] : null;

  const latestBio = Array.isArray(latest.extracted_data) ? latest.extracted_data : [];
  const prevBio = previous && Array.isArray(previous.extracted_data) ? previous.extracted_data : [];

  const latestT = findBiomarker(latestBio, "testosteron") ?? findBiomarker(latestBio, "testosterone");
  const prevT = prevBio.length ? (findBiomarker(prevBio, "testosteron") ?? findBiomarker(prevBio, "testosterone")) : null;
  const tChange = latestT && prevT ? (((latestT - prevT) / prevT) * 100).toFixed(1) : null;

  const latestC = findBiomarker(latestBio, "kortizol") ?? findBiomarker(latestBio, "cortisol");
  const prevC = prevBio.length ? (findBiomarker(prevBio, "kortizol") ?? findBiomarker(prevBio, "cortisol")) : null;
  const cChange = latestC && prevC ? (((latestC - prevC) / prevC) * 100).toFixed(1) : null;

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
            <p className="text-xs text-muted-foreground">Testosteron / Kortizol Oranı</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">Güncelleme: {lastDate}</span>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Testosteron</span>
              {tChange && (
                <div className="flex items-center gap-1 text-xs">
                  {Number(tChange) > 0 ? (
                    <TrendingUp className="w-3 h-3 text-success" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-destructive" />
                  )}
                  <span className={Number(tChange) > 0 ? "text-success" : "text-destructive"}>
                    %{tChange}
                  </span>
                </div>
              )}
            </div>
            <p className="text-xl font-bold font-mono text-primary mt-1">
              {latestT != null ? `${latestT} ng/dL` : "—"}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Kortizol</span>
              {cChange && (
                <div className="flex items-center gap-1 text-xs">
                  {Number(cChange) < 0 ? (
                    <TrendingDown className="w-3 h-3 text-success" />
                  ) : (
                    <TrendingUp className="w-3 h-3 text-warning" />
                  )}
                  <span className={Number(cChange) < 0 ? "text-success" : "text-warning"}>
                    %{cChange}
                  </span>
                </div>
              )}
            </div>
            <p className="text-xl font-bold font-mono text-warning mt-1">
              {latestC != null ? `${latestC} μg/dL` : "—"}
            </p>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 1 && (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line yAxisId="left" type="monotone" dataKey="testosterone" stroke="hsl(68, 100%, 50%)" strokeWidth={2} dot={{ fill: "hsl(68, 100%, 50%)", strokeWidth: 0, r: 3 }} connectNulls />
                <Line yAxisId="right" type="monotone" dataKey="cortisol" stroke="hsl(45, 100%, 50%)" strokeWidth={2} dot={{ fill: "hsl(45, 100%, 50%)", strokeWidth: 0, r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* T:C Ratio */}
        {latestT != null && latestC != null && latestC > 0 && (
          <div className="mt-3 p-2 rounded-lg bg-secondary/50 text-center">
            <span className="text-xs text-muted-foreground">T:C Oranı: </span>
            <span className="font-mono font-bold text-success">{(latestT / latestC).toFixed(1)}</span>
            <span className="text-xs text-muted-foreground ml-2">(Optimal: &gt;30)</span>
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

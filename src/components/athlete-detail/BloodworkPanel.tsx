import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { BloodworkDialog } from "./BloodworkDialog";

// Mock bloodwork data over 6 months
const bloodworkData = [
  { month: "Ağu", testosterone: 580, cortisol: 18 },
  { month: "Eyl", testosterone: 620, cortisol: 16 },
  { month: "Eki", testosterone: 590, cortisol: 19 },
  { month: "Kas", testosterone: 640, cortisol: 15 },
  { month: "Ara", testosterone: 680, cortisol: 14 },
  { month: "Oca", testosterone: 720, cortisol: 12 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass border border-border rounded-lg px-3 py-2 text-sm">
        <p className="font-medium text-foreground mb-1">{label}</p>
        <div className="space-y-1">
          <p className="text-primary font-mono">
            T: {payload[0]?.value} ng/dL
          </p>
          <p className="text-warning font-mono">
            C: {payload[1]?.value} μg/dL
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function BloodworkPanel() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const latestT = bloodworkData[bloodworkData.length - 1].testosterone;
  const previousT = bloodworkData[bloodworkData.length - 2].testosterone;
  const tChange = ((latestT - previousT) / previousT * 100).toFixed(1);

  const latestC = bloodworkData[bloodworkData.length - 1].cortisol;
  const previousC = bloodworkData[bloodworkData.length - 2].cortisol;
  const cChange = ((latestC - previousC) / previousC * 100).toFixed(1);

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
            <span className="text-xs font-mono text-muted-foreground">Güncelleme: 15 Oca</span>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Testosteron</span>
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
            </div>
            <p className="text-xl font-bold font-mono text-primary mt-1">{latestT} ng/dL</p>
          </div>
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Kortizol</span>
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
            </div>
            <p className="text-xl font-bold font-mono text-warning mt-1">{latestC} μg/dL</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bloodworkData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[500, 800]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[10, 25]}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine yAxisId="left" y={600} stroke="hsl(var(--primary))" strokeDasharray="3 3" opacity={0.3} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="testosterone"
                stroke="hsl(68, 100%, 50%)"
                strokeWidth={2}
                dot={{ fill: "hsl(68, 100%, 50%)", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, stroke: "hsl(68, 100%, 50%)", strokeWidth: 2, fill: "hsl(var(--background))" }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cortisol"
                stroke="hsl(45, 100%, 50%)"
                strokeWidth={2}
                dot={{ fill: "hsl(45, 100%, 50%)", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, stroke: "hsl(45, 100%, 50%)", strokeWidth: 2, fill: "hsl(var(--background))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* T:C Ratio */}
        <div className="mt-3 p-2 rounded-lg bg-secondary/50 text-center">
          <span className="text-xs text-muted-foreground">T:C Oranı: </span>
          <span className="font-mono font-bold text-success">
            {(latestT / latestC).toFixed(1)}
          </span>
          <span className="text-xs text-muted-foreground ml-2">(Optimal: &gt;30)</span>
        </div>

        {/* Click hint */}
        <p className="text-xs text-center text-muted-foreground mt-2 group-hover:text-primary transition-colors">
          Detaylar için tıklayın
        </p>
      </div>

      <BloodworkDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

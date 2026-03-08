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

// Mock metabolic data over 30 days
const generateMetabolicData = () => {
  const data = [];
  for (let i = 0; i < 30; i++) {
    const baseExpenditure = 2800 + Math.sin(i / 5) * 200;
    const baseIntake = 2600 + Math.random() * 400;
    data.push({
      day: i + 1,
      tdee: Math.round(baseExpenditure + Math.random() * 150),
      intake: Math.round(baseIntake),
    });
  }
  return data;
};

const metabolicData = generateMetabolicData();

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const tdee = payload[0]?.value || 0;
    const intake = payload[1]?.value || 0;
    const balance = intake - tdee;
    
    return (
      <div className="glass border border-border rounded-lg px-3 py-2 text-sm">
        <p className="font-medium text-foreground mb-2">Gün {label}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Flame className="w-3 h-3 text-destructive" />
            <span className="text-muted-foreground">TDEE:</span>
            <span className="font-mono text-foreground">{tdee} kcal</span>
          </div>
          <div className="flex items-center gap-2">
            <Utensils className="w-3 h-3 text-success" />
            <span className="text-muted-foreground">Alım:</span>
            <span className="font-mono text-foreground">{intake} kcal</span>
          </div>
          <div className="pt-1 border-t border-border">
            <span className="text-muted-foreground">Denge: </span>
            <span className={`font-mono font-bold ${balance > 0 ? "text-success" : "text-primary"}`}>
              {balance > 0 ? "+" : ""}{balance} kcal
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function MetabolicFlux() {
  const avgTDEE = Math.round(metabolicData.reduce((a, b) => a + b.tdee, 0) / metabolicData.length);
  const avgIntake = Math.round(metabolicData.reduce((a, b) => a + b.intake, 0) / metabolicData.length);
  const avgBalance = avgIntake - avgTDEE;

  return (
    <div className="glass rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Metabolik Akış</h3>
          <p className="text-xs text-muted-foreground">Enerji Harcaması vs. Kalori Alımı</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-destructive/70" />
            <span className="text-muted-foreground">TDEE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-success/70" />
            <span className="text-muted-foreground">Alım</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
          <p className="text-xs text-muted-foreground">Ort. TDEE</p>
          <p className="text-xl font-bold font-mono text-destructive">{avgTDEE}</p>
        </div>
        <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
          <p className="text-xs text-muted-foreground">Ort. Alım</p>
          <p className="text-xl font-bold font-mono text-success">{avgIntake}</p>
        </div>
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
          <p className="text-xs text-muted-foreground">Denge</p>
          <p className={`text-xl font-bold font-mono ${avgBalance > 0 ? "text-success" : "text-primary"}`}>
            {avgBalance > 0 ? "+" : ""}{avgBalance}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={metabolicData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTDEE" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorIntake" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="day"
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={[2000, 3500]}
              tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={avgTDEE} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.5} />
            <Area
              type="monotone"
              dataKey="tdee"
              stroke="hsl(0, 84%, 60%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorTDEE)"
            />
            <Area
              type="monotone"
              dataKey="intake"
              stroke="hsl(142, 76%, 36%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorIntake)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

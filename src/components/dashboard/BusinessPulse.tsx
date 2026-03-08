import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Users, Dumbbell, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessPulse } from "@/hooks/useBusinessPulse";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass border border-border rounded-lg px-4 py-3 shadow-lg">
        <p className="font-medium text-foreground mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3 text-primary" />
            <span className="text-sm text-muted-foreground">Sporcular:</span>
            <span className="font-mono font-medium text-primary">
              {payload[0]?.value}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Dumbbell className="w-3 h-3 text-success" />
            <span className="text-sm text-muted-foreground">Antrenman:</span>
            <span className="font-mono font-medium text-success">
              {payload[1]?.value}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-3 h-3 text-warning" />
            <span className="text-sm text-muted-foreground">Gelir:</span>
            <span className="font-mono font-medium text-warning">
              ₺{payload[2]?.value?.toLocaleString("tr-TR")}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function BusinessPulse() {
  const {
    chartData, currentAthletes, currentWorkouts, totalRevenue,
    athleteGrowth, workoutGrowth, revenueGrowth, isLoading
  } = useBusinessPulse();

  if (isLoading) {
    return (
      <div className="glass rounded-xl border border-border p-5">
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-48 mb-6" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const athleteGrowthNum = parseFloat(athleteGrowth);
  const workoutGrowthNum = parseFloat(workoutGrowth);
  const revenueGrowthNum = parseFloat(revenueGrowth);

  return (
    <div className="glass rounded-xl border border-border p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">İş Nabzı</h3>
          <p className="text-sm text-muted-foreground">30 günlük sporcu, antrenman & gelir özeti</p>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          {/* Athletes */}
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {currentAthletes}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              {athleteGrowthNum >= 0 ? (
                <TrendingUp className="w-3 h-3 text-success" />
              ) : (
                <TrendingDown className="w-3 h-3 text-destructive" />
              )}
              <span className={`font-mono ${athleteGrowthNum >= 0 ? "text-success" : "text-destructive"}`}>
                {athleteGrowthNum >= 0 ? "+" : ""}%{athleteGrowth}
              </span>
            </div>
          </div>

          <div className="w-px h-10 bg-border" />

          {/* Workouts */}
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <Dumbbell className="w-4 h-4 text-success" />
              <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {currentWorkouts}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              {workoutGrowthNum >= 0 ? (
                <TrendingUp className="w-3 h-3 text-success" />
              ) : (
                <TrendingDown className="w-3 h-3 text-destructive" />
              )}
              <span className={`font-mono ${workoutGrowthNum >= 0 ? "text-success" : "text-destructive"}`}>
                {workoutGrowthNum >= 0 ? "+" : ""}%{workoutGrowth}
              </span>
            </div>
          </div>

          <div className="w-px h-10 bg-border" />

          {/* Revenue */}
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <DollarSign className="w-4 h-4 text-warning" />
              <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {totalRevenue >= 1000
                  ? `₺${(totalRevenue / 1000).toFixed(1)}K`
                  : `₺${totalRevenue.toLocaleString("tr-TR")}`}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              {revenueGrowthNum >= 0 ? (
                <TrendingUp className="w-3 h-3 text-success" />
              ) : (
                <TrendingDown className="w-3 h-3 text-destructive" />
              )}
              <span className={`font-mono ${revenueGrowthNum >= 0 ? "text-success" : "text-destructive"}`}>
                {revenueGrowthNum >= 0 ? "+" : ""}%{revenueGrowth}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(68, 100%, 50%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(68, 100%, 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorWorkouts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(45, 100%, 50%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(45, 100%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              yAxisId="left"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₺${value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
              formatter={(value: string) => (
                <span className="text-muted-foreground capitalize">
                  {value === "athletes" ? "Sporcular" : value === "workouts" ? "Antrenmanlar" : "Gelir"}
                </span>
              )}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="athletes"
              stroke="hsl(68, 100%, 50%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorStudents)"
              dot={false}
              activeDot={{
                r: 6,
                stroke: "hsl(68, 100%, 50%)",
                strokeWidth: 2,
                fill: "hsl(var(--background))",
              }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="workouts"
              stroke="hsl(142, 76%, 36%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorWorkouts)"
              dot={false}
              activeDot={{
                r: 6,
                stroke: "hsl(142, 76%, 36%)",
                strokeWidth: 2,
                fill: "hsl(var(--background))",
              }}
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="revenue"
              stroke="hsl(45, 100%, 50%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
              dot={false}
              activeDot={{
                r: 6,
                stroke: "hsl(45, 100%, 50%)",
                strokeWidth: 2,
                fill: "hsl(var(--background))",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

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
import { TrendingUp, Users, DollarSign } from "lucide-react";

// Generate 30 days of mock data
const generateMockData = () => {
  const data = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Simulate growth pattern
    const baseStudents = 42 + Math.floor(i / 5);
    const baseRevenue = 22000 + i * 150;

    data.push({
      date: date.toLocaleDateString("tr-TR", { month: "short", day: "numeric" }),
      students: baseStudents + Math.floor(Math.random() * 5),
      revenue: baseRevenue + Math.floor(Math.random() * 1000),
    });
  }

  return data;
};

const mockData = generateMockData();

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
            <DollarSign className="w-3 h-3 text-success" />
            <span className="text-sm text-muted-foreground">Gelir:</span>
            <span className="font-mono font-medium text-success">
              ₺{payload[1]?.value?.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function BusinessPulse() {
  const latestData = mockData[mockData.length - 1];
  const previousData = mockData[mockData.length - 8]; // Week ago

  const studentGrowth = (
    ((latestData.students - previousData.students) / previousData.students) *
    100
  ).toFixed(1);

  const revenueGrowth = (
    ((latestData.revenue - previousData.revenue) / previousData.revenue) *
    100
  ).toFixed(1);

  return (
    <div className="glass rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">İş Nabzı</h3>
          <p className="text-sm text-muted-foreground">30 günlük performans özeti</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-2xl font-bold font-mono text-foreground">
                {latestData.students}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <TrendingUp className="w-3 h-3 text-success" />
              <span className="text-success font-mono">+%{studentGrowth}</span>
              <span className="text-muted-foreground">sporcu</span>
            </div>
          </div>

          <div className="w-px h-10 bg-border" />

          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <DollarSign className="w-4 h-4 text-success" />
              <span className="text-2xl font-bold font-mono text-foreground">
                ₺{(latestData.revenue / 1000).toFixed(1)}K
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <TrendingUp className="w-3 h-3 text-success" />
              <span className="text-success font-mono">+%{revenueGrowth}</span>
              <span className="text-muted-foreground">gelir</span>
            </div>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={mockData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(68, 100%, 50%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(68, 100%, 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
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
              tickFormatter={(value) => `${value}`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₺${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
              formatter={(value) => (
                <span className="text-muted-foreground capitalize">
                  {value === "students" ? "Sporcular" : "Gelir"}
                </span>
              )}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="students"
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
              yAxisId="right"
              type="monotone"
              dataKey="revenue"
              stroke="hsl(142, 76%, 36%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
              dot={false}
              activeDot={{
                r: 6,
                stroke: "hsl(142, 76%, 36%)",
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

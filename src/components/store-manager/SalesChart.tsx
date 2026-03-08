import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

const revenueData = [
  { name: "Koçluk Hizmetleri", value: 45000, color: "hsl(var(--primary))" },
  { name: "Dijital Ürünler", value: 12000, color: "hsl(var(--info))" },
  { name: "Fiziksel Ürünler", value: 8500, color: "hsl(var(--warning))" },
];

const monthlyStats = [
  { label: "Bu Ay Toplam", value: "₺65.500", change: 12.5, up: true },
  { label: "Ortalama Sipariş", value: "₺1.850", change: 8.2, up: true },
  { label: "Aktif Abonelik", value: "18", change: 2, up: true },
  { label: "İptal Oranı", value: "%4.2", change: 0.8, up: false },
];

export function SalesChart() {
  const total = revenueData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {monthlyStats.map((stat) => (
          <div key={stat.label} className="glass rounded-xl p-4 border border-border">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <div className="flex items-end justify-between mt-1">
              <span className="text-xl font-bold text-foreground">{stat.value}</span>
              <div className={`flex items-center gap-0.5 text-xs ${stat.up ? "text-success" : "text-destructive"}`}>
                {stat.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{stat.change}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pie Chart */}
      <div className="glass rounded-xl p-4 border border-border">
        <h4 className="text-sm font-semibold text-foreground mb-4">Gelir Dağılımı</h4>
        
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={revenueData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
              >
                {revenueData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`₺${value.toLocaleString("tr-TR")}`, "Gelir"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="space-y-2 mt-4">
          {revenueData.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground">{item.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-foreground">
                  ₺{item.value.toLocaleString("tr-TR")}
                </span>
                <span className="text-xs text-muted-foreground w-10 text-right">
                  {((item.value / total) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Toplam Gelir</span>
          <span className="text-lg font-bold text-primary">
            ₺{total.toLocaleString("tr-TR")}
          </span>
        </div>
      </div>
    </div>
  );
}

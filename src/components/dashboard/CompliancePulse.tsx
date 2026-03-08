import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { Dumbbell, Apple, MessageCircle } from "lucide-react";

interface DonutChartProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  subLabel?: string;
}

function DonutChart({ title, value, icon, color, subLabel }: DonutChartProps) {
  const data = [
    { name: "Tamamlanan", value: value },
    { name: "Kalan", value: 100 - value },
  ];

  const getColorClass = () => {
    if (value >= 80) return "text-success";
    if (value >= 60) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="glass rounded-xl border border-border p-5 flex flex-col items-center group hover:border-primary/30 transition-all duration-300">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
        <h4 className="font-medium text-foreground">{title}</h4>
      </div>

      <div className="relative w-40 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={70}
              startAngle={90}
              endAngle={-270}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill={color} className="drop-shadow-[0_0_8px_var(--primary)]" />
              <Cell fill="hsl(var(--muted))" />
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="glass border border-border rounded-lg px-3 py-2 text-sm">
                      <p className="font-medium text-foreground">{payload[0].name}</p>
                      <p className="font-mono text-primary">%{payload[0].value}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-bold font-mono", getColorClass())}>
            %{value}
          </span>
          {subLabel && (
            <span className="text-xs text-muted-foreground">{subLabel}</span>
          )}
        </div>
      </div>

      {/* Progress bar alternative */}
      <div className="w-full mt-4 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">İlerleme</span>
          <span className="font-mono text-foreground">{value}/100</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${value}%`,
              backgroundColor: color,
              boxShadow: `0 0 10px ${color}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function CompliancePulse() {
  const metrics = [
    {
      title: "Antrenman Uyumu",
      value: 92,
      icon: <Dumbbell className="w-4 h-4 text-primary" />,
      color: "hsl(68, 100%, 50%)",
      subLabel: "Bu Hafta",
    },
    {
      title: "Beslenme Uyumu",
      value: 74,
      icon: <Apple className="w-4 h-4 text-primary" />,
      color: "hsl(45, 100%, 50%)",
      subLabel: "Ort. Skor",
    },
    {
      title: "Check-in Tamamlama",
      value: 60,
      icon: <MessageCircle className="w-4 h-4 text-primary" />,
      color: "hsl(0, 84%, 60%)",
      subLabel: "48sa Penceresi",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Uyumluluk Nabzı</h3>
        <p className="text-sm text-muted-foreground">Takım geneli uyum metrikleri</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <DonutChart key={metric.title} {...metric} />
        ))}
      </div>
    </div>
  );
}

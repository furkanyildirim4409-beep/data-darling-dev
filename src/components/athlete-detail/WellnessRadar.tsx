import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface WellnessRadarProps {
  data: {
    sleep: number | null;
    stress: number | null;
    digestion: number | null;
    mood: number | null;
    soreness: number | null;
  };
}

export function WellnessRadar({ data }: WellnessRadarProps) {
  const hasAnyData = Object.values(data).some((v) => v !== null);

  const chartData = [
    { subject: "Uyku", value: data.sleep ?? 0, fullMark: 5 },
    { subject: "Stres", value: data.stress !== null ? 5 - data.stress : 0, fullMark: 5 },
    { subject: "Sindirim", value: data.digestion ?? 0, fullMark: 5 },
    { subject: "Ruh Hali", value: data.mood ?? 0, fullMark: 5 },
    { subject: "Toparlanma", value: data.soreness !== null ? 5 - data.soreness : 0, fullMark: 5 },
  ];

  const labelMap: Record<string, string> = {
    sleep: "Uyku",
    stress: "Stres",
    digestion: "Sindirim",
    mood: "Ruh Hali",
    soreness: "Ağrı",
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass border border-border rounded-lg px-3 py-2 text-sm">
          <p className="font-medium text-foreground">{payload[0].payload.subject}</p>
          <p className="font-mono text-primary">{payload[0].value}/5</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-2">Sağlık Radarı</h3>
      <p className="text-xs text-muted-foreground mb-4">Gerçek zamanlı biyometrik görünüm</p>

      {!hasAnyData ? (
        <div className="h-56 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Check-in verisi bulunamadı</p>
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 5]}
                tickCount={6}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                axisLine={false}
              />
              <Radar
                name="Wellness"
                dataKey="value"
                stroke="hsl(68, 100%, 50%)"
                fill="hsl(68, 100%, 50%)"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-5 gap-2 mt-4 text-center">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="p-2 rounded-lg bg-secondary/50">
            <p className="text-lg font-bold font-mono text-foreground">
              {value !== null ? value : "-"}
            </p>
            <p className="text-[10px] text-muted-foreground">{labelMap[key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

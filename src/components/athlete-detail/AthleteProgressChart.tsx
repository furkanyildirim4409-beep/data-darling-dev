import { useAthleteProgress } from "@/hooks/useAthleteProgress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";

interface Props {
  athleteId: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-background/90 backdrop-blur-md px-3 py-2 shadow-xl text-xs space-y-1">
      <p className="font-medium text-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.dataKey === "weight" ? "Kilo" : "Yağ %"}</span>
          <span className="font-mono font-medium text-foreground ml-auto">
            {p.value}{p.dataKey === "weight" ? " kg" : "%"}
          </span>
        </div>
      ))}
    </div>
  );
};

export function AthleteProgressChart({ athleteId }: Props) {
  const { data, isLoading } = useAthleteProgress(athleteId);

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  return (
    <Card className="glass border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <TrendingUp className="w-4 h-4 text-primary" />
          Fiziksel Gelişim (Kilo & Yağ Oranı)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length < 2 ? (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground text-center">
            Gelişim grafiği için daha fazla ölçüm verisi bekleniyor.
          </div>
        ) : (
          <ChartContainer config={{
            weight: { label: "Kilo (kg)", color: "hsl(var(--primary))" },
            bodyFat: { label: "Yağ %", color: "hsl(var(--accent))" },
          }} className="h-56 w-full">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} domain={["auto", "auto"]} unit=" kg" className="text-muted-foreground" />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={["auto", "auto"]} unit="%" className="text-muted-foreground" />
              <Tooltip content={<CustomTooltip />} />
              <Line yAxisId="left" type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} connectNulls />
              <Line yAxisId="right" type="monotone" dataKey="bodyFat" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--accent))" }} connectNulls />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

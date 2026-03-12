import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Minus,
  Droplets,
  Download,
  GitCompareArrows,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface BloodworkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const statusStyles = {
  optimal: { bg: "bg-success/10", text: "text-success", border: "border-success/30", icon: CheckCircle },
  warning: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/30", icon: Minus },
  low: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30", icon: TrendingDown },
  high: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30", icon: TrendingUp },
};

// Hormonal comparison chart component
function HormonalComparisonChart({
  current,
  previous,
  currentDate,
  previousDate,
}: {
  current: Biomarker[];
  previous: Biomarker[];
  currentDate: string;
  previousDate: string;
}) {
  if (!current.length || !previous.length) return null;

  // Build comparison data — match biomarkers by name
  const comparisonData = current
    .map((cur) => {
      const prev = previous.find(
        (p) => p.name.toLowerCase() === cur.name.toLowerCase()
      );
      if (!prev) return null;
      const changePct = prev.value !== 0 ? ((cur.value - prev.value) / prev.value) * 100 : 0;
      return {
        name: cur.name.length > 12 ? cur.name.substring(0, 12) + "…" : cur.name,
        fullName: cur.name,
        current: cur.value,
        previous: prev.value,
        unit: cur.unit,
        change: Number(changePct.toFixed(1)),
        status: cur.status,
      };
    })
    .filter(Boolean) as {
    name: string;
    fullName: string;
    current: number;
    previous: number;
    unit: string;
    change: number;
    status: string;
  }[];

  if (comparisonData.length === 0) return null;

  const ComparisonTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
      <div className="glass border border-border rounded-lg px-3 py-2 text-xs">
        <p className="font-semibold text-foreground mb-1.5">{d.fullName}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Önceki:</span>
            <span className="font-mono font-medium text-muted-foreground">
              {d.previous} {d.unit}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-primary">Güncel:</span>
            <span className="font-mono font-bold text-primary">
              {d.current} {d.unit}
            </span>
          </div>
          <div className="border-t border-border pt-1 flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Değişim:</span>
            <span
              className={cn(
                "font-mono font-bold",
                d.change > 0 ? "text-success" : d.change < 0 ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {d.change > 0 ? "+" : ""}
              {d.change}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <GitCompareArrows className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Hormonel Karşılaştırma</h4>
      </div>
      <div className="flex items-center gap-4 mb-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-muted-foreground/40" />
          <span className="text-muted-foreground">{previousDate}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-foreground font-medium">{currentDate}</span>
        </div>
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={comparisonData}
            margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
            barGap={2}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} />
            <Tooltip content={<ComparisonTooltip />} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />
            <Bar dataKey="previous" radius={[3, 3, 0, 0]} fill="hsl(var(--muted-foreground))" opacity={0.35} />
            <Bar dataKey="current" radius={[3, 3, 0, 0]}>
              {comparisonData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.status === "optimal"
                      ? "hsl(var(--success))"
                      : entry.status === "warning"
                      ? "hsl(var(--warning))"
                      : "hsl(var(--destructive))"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Change badges */}
      <div className="flex flex-wrap gap-2 mt-3">
        {comparisonData.map((d) => (
          <div
            key={d.fullName}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono border",
              d.change > 0
                ? "bg-success/10 text-success border-success/20"
                : d.change < 0
                ? "bg-destructive/10 text-destructive border-destructive/20"
                : "bg-muted text-muted-foreground border-border"
            )}
          >
            {d.change > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : d.change < 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            <span className="font-medium">{d.name}</span>
            <span>{d.change > 0 ? "+" : ""}{d.change}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BloodworkDialog({ open, onOpenChange, athleteId }: BloodworkDialogProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ["blood-tests", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_tests")
        .select("*")
        .eq("user_id", athleteId)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as BloodTest[];
    },
    enabled: !!athleteId && open,
  });

  const selectedTest = tests[selectedIndex];
  const biomarkers: Biomarker[] = selectedTest && Array.isArray(selectedTest.extracted_data)
    ? selectedTest.extracted_data
    : [];

  // Previous test for comparison (next index since sorted desc)
  const previousTest = tests[selectedIndex + 1] ?? null;
  const previousBiomarkers: Biomarker[] = previousTest && Array.isArray(previousTest.extracted_data)
    ? previousTest.extracted_data
    : [];

  const optimalCount = biomarkers.filter((b) => b.status === "optimal").length;
  const issueCount = biomarkers.length - optimalCount;

  const handleDownload = () => {
    if (selectedTest?.document_url) {
      window.open(selectedTest.document_url, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-foreground">Kan Tahlili Geçmişi</span>
              <p className="text-sm font-normal text-muted-foreground">
                Detaylı biyobelirteç analizi
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="animate-pulse text-muted-foreground text-sm">Yükleniyor...</div>
          </div>
        ) : tests.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
            <Droplets className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Bu sporcu henüz kan tahlili yüklememiş.</p>
          </div>
        ) : (
          <>
            {/* Date Tabs */}
            <div className="flex items-center gap-2 py-4 border-b border-border flex-wrap">
              {tests.map((test, idx) => (
                <Button
                  key={test.id}
                  variant={selectedIndex === idx ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedIndex(idx)}
                  className={cn(
                    selectedIndex === idx
                      ? "bg-primary text-primary-foreground"
                      : "border-border hover:bg-secondary"
                  )}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {format(new Date(test.date), "dd.MM.yyyy")}
                </Button>
              ))}
            </div>

            {/* Summary */}
            {biomarkers.length > 0 && (
              <div className="flex items-center gap-4 py-3">
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {optimalCount} Normal
                </Badge>
                {issueCount > 0 && (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {issueCount} Dikkat Gerekli
                  </Badge>
                )}
                <Badge variant="outline" className="border-border text-muted-foreground">
                  {selectedTest?.file_name}
                </Badge>
              </div>
            )}

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Hormonal Comparison Chart */}
              {previousBiomarkers.length > 0 && biomarkers.length > 0 && (
                <HormonalComparisonChart
                  current={biomarkers}
                  previous={previousBiomarkers}
                  currentDate={format(new Date(selectedTest.date), "dd MMM yy", { locale: tr })}
                  previousDate={format(new Date(previousTest!.date), "dd MMM yy", { locale: tr })}
                />
              )}

              {/* Biomarkers Grid */}
              {biomarkers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    Bu tahlil için henüz biyobelirteç verisi çıkarılmamış.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Durum: {selectedTest?.status}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {biomarkers.map((marker) => {
                    const style = statusStyles[marker.status as keyof typeof statusStyles] || statusStyles.optimal;
                    const Icon = style.icon;
                    // Find previous value for inline delta
                    const prevMarker = previousBiomarkers.find(
                      (p) => p.name.toLowerCase() === marker.name.toLowerCase()
                    );
                    const delta =
                      prevMarker && prevMarker.value !== 0
                        ? ((marker.value - prevMarker.value) / prevMarker.value) * 100
                        : null;

                    return (
                      <div
                        key={marker.name}
                        className={cn("p-4 rounded-xl border transition-all", style.bg, style.border)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">{marker.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Normal: {marker.range} {marker.unit}
                            </p>
                          </div>
                          <div className={cn("p-1.5 rounded-lg", style.bg)}>
                            <Icon className={cn("w-4 h-4", style.text)} />
                          </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className={cn("text-2xl font-bold font-mono", style.text)}>
                            {marker.value}
                          </span>
                          <span className="text-sm text-muted-foreground">{marker.unit}</span>
                          {delta !== null && (
                            <span
                              className={cn(
                                "text-xs font-mono ml-auto",
                                delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground"
                              )}
                            >
                              {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"}{" "}
                              {delta > 0 ? "+" : ""}
                              {delta.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Tarih: {selectedTest && format(new Date(selectedTest.date), "dd MMMM yyyy", { locale: tr })}
              </p>
              <Button variant="outline" className="border-border" onClick={handleDownload} disabled={!selectedTest?.document_url}>
                <Download className="w-4 h-4 mr-2" />
                PDF Olarak İndir
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

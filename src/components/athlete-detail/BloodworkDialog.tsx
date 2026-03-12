import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Minus,
  Droplets,
  Download,
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

            {/* Biomarkers */}
            <div className="flex-1 overflow-y-auto">
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

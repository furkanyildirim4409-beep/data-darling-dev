import { useState } from "react";
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
} from "lucide-react";

interface BloodworkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Bloodwork history data by date
const bloodworkHistory = {
  "15.01.2025": {
    date: "15.01.2025",
    biomarkers: [
      { name: "Testosteron", value: 720, unit: "ng/dL", range: "300-1000", status: "optimal" },
      { name: "Serbest Testosteron", value: 18.5, unit: "pg/mL", range: "8.7-25.1", status: "optimal" },
      { name: "Kortizol", value: 12, unit: "μg/dL", range: "6-23", status: "optimal" },
      { name: "Östradiol (E2)", value: 28, unit: "pg/mL", range: "10-40", status: "optimal" },
      { name: "SHBG", value: 35, unit: "nmol/L", range: "10-57", status: "optimal" },
      { name: "LH", value: 5.2, unit: "mIU/mL", range: "1.7-8.6", status: "optimal" },
      { name: "FSH", value: 4.1, unit: "mIU/mL", range: "1.5-12.4", status: "optimal" },
      { name: "TSH", value: 1.8, unit: "mIU/L", range: "0.4-4.0", status: "optimal" },
      { name: "Demir", value: 95, unit: "μg/dL", range: "60-170", status: "optimal" },
      { name: "Ferritin", value: 85, unit: "ng/mL", range: "30-300", status: "optimal" },
      { name: "Vitamin D", value: 55, unit: "ng/mL", range: "30-100", status: "optimal" },
      { name: "B12 Vitamini", value: 650, unit: "pg/mL", range: "200-900", status: "optimal" },
      { name: "HbA1c", value: 5.2, unit: "%", range: "4.0-5.6", status: "optimal" },
      { name: "CRP", value: 0.8, unit: "mg/L", range: "0-3", status: "optimal" },
    ],
  },
  "01.10.2024": {
    date: "01.10.2024",
    biomarkers: [
      { name: "Testosteron", value: 590, unit: "ng/dL", range: "300-1000", status: "warning" },
      { name: "Serbest Testosteron", value: 14.2, unit: "pg/mL", range: "8.7-25.1", status: "optimal" },
      { name: "Kortizol", value: 19, unit: "μg/dL", range: "6-23", status: "warning" },
      { name: "Östradiol (E2)", value: 42, unit: "pg/mL", range: "10-40", status: "high" },
      { name: "SHBG", value: 38, unit: "nmol/L", range: "10-57", status: "optimal" },
      { name: "LH", value: 4.8, unit: "mIU/mL", range: "1.7-8.6", status: "optimal" },
      { name: "FSH", value: 3.9, unit: "mIU/mL", range: "1.5-12.4", status: "optimal" },
      { name: "TSH", value: 2.1, unit: "mIU/L", range: "0.4-4.0", status: "optimal" },
      { name: "Demir", value: 55, unit: "μg/dL", range: "60-170", status: "low" },
      { name: "Ferritin", value: 28, unit: "ng/mL", range: "30-300", status: "low" },
      { name: "Vitamin D", value: 22, unit: "ng/mL", range: "30-100", status: "low" },
      { name: "B12 Vitamini", value: 420, unit: "pg/mL", range: "200-900", status: "optimal" },
      { name: "HbA1c", value: 5.4, unit: "%", range: "4.0-5.6", status: "optimal" },
      { name: "CRP", value: 2.5, unit: "mg/L", range: "0-3", status: "warning" },
    ],
  },
  "15.06.2024": {
    date: "15.06.2024",
    biomarkers: [
      { name: "Testosteron", value: 480, unit: "ng/dL", range: "300-1000", status: "warning" },
      { name: "Serbest Testosteron", value: 11.5, unit: "pg/mL", range: "8.7-25.1", status: "optimal" },
      { name: "Kortizol", value: 22, unit: "μg/dL", range: "6-23", status: "warning" },
      { name: "Östradiol (E2)", value: 48, unit: "pg/mL", range: "10-40", status: "high" },
      { name: "SHBG", value: 42, unit: "nmol/L", range: "10-57", status: "optimal" },
      { name: "LH", value: 3.5, unit: "mIU/mL", range: "1.7-8.6", status: "optimal" },
      { name: "FSH", value: 3.2, unit: "mIU/mL", range: "1.5-12.4", status: "optimal" },
      { name: "TSH", value: 2.8, unit: "mIU/L", range: "0.4-4.0", status: "optimal" },
      { name: "Demir", value: 48, unit: "μg/dL", range: "60-170", status: "low" },
      { name: "Ferritin", value: 22, unit: "ng/mL", range: "30-300", status: "low" },
      { name: "Vitamin D", value: 18, unit: "ng/mL", range: "30-100", status: "low" },
      { name: "B12 Vitamini", value: 320, unit: "pg/mL", range: "200-900", status: "optimal" },
      { name: "HbA1c", value: 5.5, unit: "%", range: "4.0-5.6", status: "optimal" },
      { name: "CRP", value: 4.2, unit: "mg/L", range: "0-3", status: "high" },
    ],
  },
};

type DateKey = keyof typeof bloodworkHistory;

const statusStyles = {
  optimal: { bg: "bg-success/10", text: "text-success", border: "border-success/30", icon: CheckCircle },
  warning: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/30", icon: Minus },
  low: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30", icon: TrendingDown },
  high: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30", icon: TrendingUp },
};

export function BloodworkDialog({ open, onOpenChange }: BloodworkDialogProps) {
  const [selectedDate, setSelectedDate] = useState<DateKey>("15.01.2025");
  const data = bloodworkHistory[selectedDate];

  const optimalCount = data.biomarkers.filter(b => b.status === "optimal").length;
  const issueCount = data.biomarkers.length - optimalCount;

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

        {/* Date Tabs */}
        <div className="flex items-center gap-2 py-4 border-b border-border">
          {Object.keys(bloodworkHistory).map((date) => (
            <Button
              key={date}
              variant={selectedDate === date ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDate(date as DateKey)}
              className={cn(
                selectedDate === date
                  ? "bg-primary text-primary-foreground"
                  : "border-border hover:bg-secondary"
              )}
            >
              <Calendar className="w-4 h-4 mr-2" />
              {date}
            </Button>
          ))}
        </div>

        {/* Summary */}
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
        </div>

        {/* Biomarkers Table */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.biomarkers.map((marker) => {
              const style = statusStyles[marker.status as keyof typeof statusStyles];
              const Icon = style.icon;
              return (
                <div
                  key={marker.name}
                  className={cn(
                    "p-4 rounded-xl border transition-all",
                    style.bg,
                    style.border
                  )}
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
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Son güncelleme: {data.date} • Tüm değerler sabah açlık durumunda alınmıştır
          </p>
          <Button variant="outline" className="border-border">
            PDF Olarak İndir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

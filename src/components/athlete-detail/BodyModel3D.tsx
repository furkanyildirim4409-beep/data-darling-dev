import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Scan } from "lucide-react";
import { BodyScanDialog } from "./BodyScanDialog";
import { BodyModel3DViewer } from "./BodyModel3DViewer";

export function BodyModel3D() {
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [hasScan, setHasScan] = useState(false);
  const [lastScanDate, setLastScanDate] = useState<Date | null>(null);

  const handleScanComplete = () => {
    setHasScan(true);
    setLastScanDate(new Date());
  };

  return (
    <div className="glass rounded-xl border border-border p-5 h-full">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        3D Vücut Kompozisyonu
      </h3>

      {hasScan && lastScanDate ? (
        <>
          <BodyModel3DViewer lastScanDate={lastScanDate} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setScanDialogOpen(true)}
            className="w-full mt-3 text-xs text-muted-foreground hover:text-primary"
          >
            <Scan className="w-3 h-3 mr-1" />
            Yeni Tarama Yap
          </Button>
        </>
      ) : (
        <>
          {/* Placeholder Body Silhouette */}
          <div className="relative aspect-[3/4] bg-gradient-to-b from-primary/5 to-transparent rounded-lg overflow-hidden flex items-center justify-center">
            <svg
              viewBox="0 0 100 180"
              className="h-[85%] w-auto opacity-40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Head */}
              <ellipse cx="50" cy="18" rx="12" ry="14" className="fill-primary/30 stroke-primary" strokeWidth="0.5" />
              
              {/* Neck */}
              <rect x="45" y="30" width="10" height="8" className="fill-primary/20 stroke-primary/50" strokeWidth="0.5" />
              
              {/* Torso */}
              <path
                d="M30 38 L70 38 L75 90 L68 95 L32 95 L25 90 Z"
                className="fill-primary/25 stroke-primary"
                strokeWidth="0.5"
              />
              
              {/* Arms */}
              <path
                d="M30 40 L20 45 L15 70 L10 95 L18 96 L25 72 L28 55"
                className="fill-primary/20 stroke-primary/50"
                strokeWidth="0.5"
              />
              <path
                d="M70 40 L80 45 L85 70 L90 95 L82 96 L75 72 L72 55"
                className="fill-primary/20 stroke-primary/50"
                strokeWidth="0.5"
              />
              
              {/* Legs */}
              <path
                d="M35 95 L32 130 L30 165 L40 165 L42 130 L45 100"
                className="fill-primary/20 stroke-primary/50"
                strokeWidth="0.5"
              />
              <path
                d="M65 95 L68 130 L70 165 L60 165 L58 130 L55 100"
                className="fill-primary/20 stroke-primary/50"
                strokeWidth="0.5"
              />

              {/* Dashed scan lines */}
              <line x1="15" y1="60" x2="85" y2="60" className="stroke-primary/30" strokeWidth="0.5" strokeDasharray="3,3" />
              <line x1="15" y1="90" x2="85" y2="90" className="stroke-primary/30" strokeWidth="0.5" strokeDasharray="3,3" />
              <line x1="15" y1="120" x2="85" y2="120" className="stroke-primary/30" strokeWidth="0.5" strokeDasharray="3,3" />
            </svg>

            {/* Scan Lines Effect */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent animate-pulse" />
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 h-px bg-primary/10"
                  style={{ top: `${(i + 1) * 12}%` }}
                />
              ))}
            </div>

            {/* Corner Markers */}
            <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-primary/50" />
            <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-primary/50" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-primary/50" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-primary/50" />

            {/* No Scan Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-2">Tarama Yok</div>
              </div>
            </div>
          </div>

          {/* Start Scan Button */}
          <Button
            onClick={() => setScanDialogOpen(true)}
            className="w-full mt-4 h-11 font-semibold group"
          >
            <Scan className="w-4 h-4 mr-2 group-hover:animate-pulse" />
            AI Vücut Taraması Başlat
          </Button>
        </>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-success/40" />
          <span className="text-muted-foreground">Güçlü</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-warning/40" />
          <span className="text-muted-foreground">Gelişiyor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive/40" />
          <span className="text-muted-foreground">Zayıf</span>
        </div>
      </div>

      {/* Scan Dialog */}
      <BodyScanDialog
        open={scanDialogOpen}
        onOpenChange={setScanDialogOpen}
        onScanComplete={handleScanComplete}
      />
    </div>
  );
}

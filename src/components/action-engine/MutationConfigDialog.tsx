import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dumbbell, UtensilsCrossed, Sparkles, Target, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiAction } from "@/services/ActionEngine";

const typeConfig: Record<string, { icon: typeof Dumbbell; label: string }> = {
  program: { icon: Dumbbell, label: "Antrenman" },
  nutrition: { icon: UtensilsCrossed, label: "Beslenme" },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: AiAction | null;
  onConfirm: (percentage: number, options?: { targetRir?: number | null; cancelFailure?: boolean }) => void;
}

export function MutationConfigDialog({ open, onOpenChange, action, onConfirm }: Props) {
  const [sliderValue, setSliderValue] = useState<number[]>([0]);
  const [targetRir, setTargetRir] = useState<string>("");
  const [cancelFailure, setCancelFailure] = useState(false);

  useEffect(() => {
    if (open) {
      setSliderValue([0]);
      setTargetRir("");
      setCancelFailure(false);
    }
  }, [open]);

  const value = sliderValue[0];
  const config = action ? typeConfig[action.type] || { icon: Sparkles, label: "Aksiyon" } : null;
  const Icon = config?.icon || Sparkles;

  const valueColor = value < 0 ? "text-destructive" : value > 0 ? "text-success" : "text-muted-foreground";
  const valuePrefix = value > 0 ? "+" : "";
  const previewRpe = Math.min(10, Math.max(1, Math.round(10 * (1 + value / 100))));

  const parsedRir = targetRir !== "" ? Math.min(5, Math.max(0, parseInt(targetRir, 10) || 0)) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            Müdahale Konfigürasyonu
          </DialogTitle>
        </DialogHeader>

        {action && (
          <div className="space-y-6 py-2">
            {/* Action Info */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                {config?.label}
              </Badge>
              <span className="text-sm font-medium text-foreground">{action.label}</span>
            </div>

            {/* AI Reasoning Box */}
            {action.payload && (
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">AI Önerisi:</span>{" "}
                  {action.payload}
                </p>
              </div>
            )}

            {/* Slider or Directive Info */}
            {action.is_quantitative !== false ? (
              <div className="space-y-4">
                <div className="text-center">
                  <span className="text-xs text-muted-foreground">Değişim Oranı</span>
                  <p className={cn("text-3xl font-black tabular-nums", valueColor)}>
                    {valuePrefix}{value}%
                  </p>
                </div>

                <Slider
                  value={sliderValue}
                  onValueChange={setSliderValue}
                  min={-50}
                  max={50}
                  step={5}
                  className="w-full"
                />

                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>-50%</span>
                  <span>0</span>
                  <span>+50%</span>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/50 p-3">
                <Sparkles className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Bu eylem matematiksel bir değişiklik gerektirmiyor. Doğrudan sporcuya direktif / protokol olarak iletilecektir.
                </p>
              </div>
            )}

            {/* RPE Auto-Scaling Preview */}
            {action?.type === "program" && value !== 0 && (
              <div className="mt-4 px-3 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-md flex items-start gap-2.5 text-blue-500">
                <Activity className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold block mb-0.5">RPE Auto-Scaling Aktif</span>
                  <p className="text-blue-500/80">
                    Egzersizlerin zorluk (RPE) değerleri {valuePrefix}{value}% oranında otomatik ölçeklenecek.
                    <br/><span className="font-mono mt-1 inline-block opacity-90">(Örn: 10 RPE → {previewRpe} RPE)</span>
                  </p>
                </div>
              </div>
            )}

            {/* Intensity Controls — only for program actions */}
            {action?.type === "program" && (
              <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold text-foreground">Yoğunluk Kontrolleri</p>

                {/* Target RIR Input */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-muted-foreground" />
                    <Label htmlFor="target-rir" className="text-xs text-muted-foreground cursor-pointer">
                      Hedef RIR Belirle (0-5)
                    </Label>
                  </div>
                  <Input
                    id="target-rir"
                    type="number"
                    min={0}
                    max={5}
                    placeholder="—"
                    value={targetRir}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") { setTargetRir(""); return; }
                      const n = parseInt(v, 10);
                      if (!isNaN(n)) setTargetRir(String(Math.min(5, Math.max(0, n))));
                    }}
                    className="w-16 h-8 text-center text-sm font-mono px-2"
                  />
                </div>
                {parsedRir !== null && (
                  <p className="text-[10px] text-muted-foreground -mt-2 ml-5">
                    Tüm egzersizlerin RIR değeri <span className="font-semibold text-foreground">{parsedRir}</span> olarak ayarlanacak.
                  </p>
                )}

                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="cancel-failure" className="text-xs text-muted-foreground cursor-pointer">
                    Tükeniş (Failure) Setlerini İptal Et
                  </Label>
                  <Switch id="cancel-failure" checked={cancelFailure} onCheckedChange={setCancelFailure} />
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={() => onConfirm(value, { targetRir: parsedRir, cancelFailure })}>
            Onayla ve Uygula
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

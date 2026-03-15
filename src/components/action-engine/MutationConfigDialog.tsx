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
import { Dumbbell, UtensilsCrossed, Sparkles } from "lucide-react";
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
  onConfirm: (percentage: number) => void;
}

export function MutationConfigDialog({ open, onOpenChange, action, onConfirm }: Props) {
  const [sliderValue, setSliderValue] = useState<number[]>([0]);

  // Reset slider every time dialog opens
  useEffect(() => {
    if (open) {
      setSliderValue([0]);
    }
  }, [open]);

  const value = sliderValue[0];
  const config = action ? typeConfig[action.type] || { icon: Sparkles, label: "Aksiyon" } : null;
  const Icon = config?.icon || Sparkles;

  const valueColor = value < 0 ? "text-destructive" : value > 0 ? "text-success" : "text-muted-foreground";
  const valuePrefix = value > 0 ? "+" : "";

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

            {/* Slider Section */}
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
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={() => onConfirm(value)}>
            Onayla ve Uygula
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

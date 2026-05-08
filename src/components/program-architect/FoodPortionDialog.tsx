import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Apple } from "lucide-react";

export interface ApiServing {
  serving_id?: string | number;
  serving_description?: string;
  metric_serving_amount?: string | number;
  metric_serving_unit?: string;
  calories?: string | number;
  protein?: string | number;
  carbohydrate?: string | number;
  fat?: string | number;
  [k: string]: any;
}

export interface PortionResult {
  // Macros for EXACTLY 1 base unit (1g / 1ml / 1 serving)
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: string;       // "g" | "ml" | "1 large" — clean unit label
  unit: string;               // mirrors serving_size
  selected_quantity: number;  // user's chosen quantity (e.g. 5 or 50)
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  foodName: string;
  servings: ApiServing[];
  onConfirm: (result: PortionResult) => void;
}

const num = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(v ?? "0");
  return Number.isFinite(n) ? n : 0;
};

export function FoodPortionDialog({ open, onOpenChange, foodName, servings, onConfirm }: Props) {
  const safeServings = servings?.length ? servings : [];
  const [idx, setIdx] = useState(0);
  const selected = safeServings[idx];

  const is100Mode = useMemo(() => {
    if (!selected) return false;
    const desc = selected.serving_description ?? "";
    if (/^(100\s?g|100\s?ml)$/i.test(String(desc).trim())) return true;
    const amt = num(selected.metric_serving_amount);
    const unit = String(selected.metric_serving_unit ?? "").toLowerCase();
    return amt === 100 && (unit === "g" || unit === "ml");
  }, [selected]);

  const [quantity, setQuantity] = useState<number>(1);

  // Reset when dialog opens or serving changes
  useEffect(() => {
    if (!open) return;
    setIdx(0);
  }, [open, servings]);

  useEffect(() => {
    setQuantity(is100Mode ? 100 : 1);
  }, [is100Mode, idx]);

  if (!selected) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{foodName}</DialogTitle>
            <DialogDescription>Bu besin için porsiyon bilgisi bulunamadı.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  // Per-1-base-unit macros (canonical storage shape)
  const per1Kcal = is100Mode ? num(selected.calories) / 100 : num(selected.calories);
  const per1Protein = is100Mode ? num(selected.protein) / 100 : num(selected.protein);
  const per1Carbs = is100Mode ? num(selected.carbohydrate) / 100 : num(selected.carbohydrate);
  const per1Fat = is100Mode ? num(selected.fat) / 100 : num(selected.fat);

  // Live preview (visual only) — multiplier × per1
  const kcal = Math.round(per1Kcal * quantity);
  const protein = Math.round(per1Protein * quantity);
  const carbs = Math.round(per1Carbs * quantity);
  const fat = Math.round(per1Fat * quantity);

  const unit = String(
    is100Mode
      ? (selected.metric_serving_unit || "g")
      : (selected.serving_description || "Porsiyon")
  ).trim();
  const serving_size = unit; // canonical clean label

  const step = is100Mode ? 10 : 0.5;
  const label = is100Mode ? "Miktar (g/ml)" : "Miktar";

  const handleConfirm = () => {
    if (!quantity || quantity <= 0) return;
    onConfirm({
      kcal: per1Kcal,
      protein: per1Protein,
      carbs: per1Carbs,
      fat: per1Fat,
      serving_size,
      unit,
      selected_quantity: quantity,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Apple className="w-5 h-5 text-success" />
            {foodName}
          </DialogTitle>
          <DialogDescription>Porsiyon ve miktar seçin, makrolar canlı güncellenir.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Porsiyon</Label>
            <Select value={String(idx)} onValueChange={(v) => setIdx(parseInt(v, 10))}>
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {safeServings.map((s, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {s.serving_description ||
                      `${s.metric_serving_amount ?? ""} ${s.metric_serving_unit ?? ""}`.trim() ||
                      `Porsiyon ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step={step}
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="bg-background/50"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">× {unit}</span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[10px] text-muted-foreground mb-2">Canlı Makro Önizleme</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="secondary" className="text-[11px] bg-warning/20 text-warning border-warning/30">
                {kcal} kcal
              </Badge>
              <Badge variant="secondary" className="text-[11px] bg-blue-500/20 text-blue-400 border-blue-500/30">
                P: {protein}g
              </Badge>
              <Badge variant="secondary" className="text-[11px] bg-success/20 text-success border-success/30">
                C: {carbs}g
              </Badge>
              <Badge variant="secondary" className="text-[11px] bg-purple-500/20 text-purple-400 border-purple-500/30">
                F: {fat}g
              </Badge>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button onClick={handleConfirm} disabled={!quantity || quantity <= 0}>
              Ekle ({quantity} × {serving_size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

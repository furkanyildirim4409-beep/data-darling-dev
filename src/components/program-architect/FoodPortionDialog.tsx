import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Apple, Minus, Plus } from "lucide-react";

export interface Serving {
  serving_id: string;
  serving_description: string;
  metric_serving_amount: number;
  metric_serving_unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  is_default?: boolean;
}

export interface PortionConfirmPayload {
  name: string;
  api_food_id: string;
  serving_size: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  food: { food_id: string; name: string; brand?: string } | null;
  servings: Serving[];
  onConfirm: (p: PortionConfirmPayload) => void;
}

const round = (n: number, d = 1) => {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
};

function detectIs100Mode(s: Serving | null) {
  if (!s) return false;
  if (/^(100\s?g|100\s?ml)$/i.test(s.serving_description)) return true;
  const unit = (s.metric_serving_unit || "").toLowerCase();
  return s.metric_serving_amount === 100 && (unit === "g" || unit === "ml");
}

function deriveBaseLabel(s: Serving): string {
  const desc = (s.serving_description || "").trim();
  // Strip leading "1 " for "1 Adet" → "Adet"
  return desc.replace(/^1\s+/, "");
}

export function FoodPortionDialog({ open, onClose, food, servings, onConfirm }: Props) {
  const defaultServing = useMemo(() => {
    if (!servings?.length) return null;
    return servings.find((s) => s.is_default) || servings[0];
  }, [servings]);

  const [selectedId, setSelectedId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (open && defaultServing) {
      setSelectedId(defaultServing.serving_id);
    }
  }, [open, defaultServing]);

  const selected = useMemo(
    () => servings.find((s) => s.serving_id === selectedId) || defaultServing,
    [servings, selectedId, defaultServing],
  );

  const is100Mode = detectIs100Mode(selected);
  const step = is100Mode ? 10 : 0.5;
  const label = is100Mode ? "Miktar (g/ml)" : "Miktar";
  const minQty = is100Mode ? 1 : 0.5;

  // Reset quantity to sensible default when serving switches
  useEffect(() => {
    if (!selected) return;
    setQuantity(is100Mode ? 100 : 1);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const multiplier = is100Mode ? quantity / 100 : quantity;

  const macros = selected
    ? {
        kcal: Math.round(selected.calories * multiplier),
        protein: round(selected.protein * multiplier),
        carbs: round(selected.carbs * multiplier),
        fats: round(selected.fat * multiplier),
      }
    : { kcal: 0, protein: 0, carbs: 0, fats: 0 };

  const servingSizeText = (() => {
    if (!selected) return "";
    if (is100Mode) {
      const unit = (selected.metric_serving_unit || "g").toLowerCase();
      return `${quantity} × ${unit}`;
    }
    const base = deriveBaseLabel(selected);
    const qStr = Number.isInteger(quantity) ? `${quantity}` : `${quantity}`;
    return `${qStr} × ${base}`;
  })();

  const handleConfirm = () => {
    if (!food || !selected) return;
    onConfirm({
      name: food.name,
      api_food_id: food.food_id,
      serving_size: servingSizeText,
      kcal: macros.kcal,
      protein: macros.protein,
      carbs: macros.carbs,
      fats: macros.fats,
    });
    onClose();
  };

  const adjust = (delta: number) => {
    setQuantity((q) => Math.max(minQty, round(q + delta, 2)));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Apple className="w-5 h-5 text-success" />
            <span className="truncate">{food?.name || "Besin"}</span>
          </DialogTitle>
          {food?.brand && (
            <p className="text-xs text-muted-foreground">{food.brand}</p>
          )}
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Serving picker */}
          <div>
            <Label className="text-xs text-muted-foreground">Porsiyon</Label>
            <Select
              value={selectedId}
              onValueChange={(v) => setSelectedId(v)}
              disabled={!servings.length}
            >
              <SelectTrigger className="mt-1.5 bg-background/50">
                <SelectValue placeholder="Porsiyon seç" />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                {servings.map((s) => (
                  <SelectItem key={s.serving_id} value={s.serving_id}>
                    {s.serving_description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div>
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => adjust(-step)}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                step={step}
                min={minQty}
                value={quantity}
                onChange={(e) => {
                  const n = parseFloat(e.target.value);
                  setQuantity(Number.isFinite(n) ? Math.max(minQty, n) : minQty);
                }}
                className="h-9 text-center bg-background/50"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => adjust(step)}
              >
                <Plus className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-fit">
                {is100Mode
                  ? (selected?.metric_serving_unit || "g").toLowerCase()
                  : deriveBaseLabel(selected || ({} as Serving))}
              </span>
            </div>
            {selected && !is100Mode && selected.metric_serving_amount > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1.5">
                ≈ {round(selected.metric_serving_amount * quantity)} {selected.metric_serving_unit}
              </p>
            )}
          </div>

          {/* Live macros */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-[10px] text-muted-foreground mb-2">Hesaplanan değerler</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
                {macros.kcal} kcal
              </Badge>
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                P: {macros.protein}g
              </Badge>
              <Badge variant="secondary" className="bg-success/20 text-success border-success/30">
                C: {macros.carbs}g
              </Badge>
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                F: {macros.fats}g
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Eklenecek porsiyon: <span className="text-foreground font-medium">{servingSizeText}</span>
            </p>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button
            className="bg-primary text-primary-foreground"
            onClick={handleConfirm}
            disabled={!selected}
          >
            Öğüne Ekle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SupplementAmountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplementName: string;
  icon?: string;
  defaultAmount: number;
  unit: string;
  onConfirm: (amount: number) => void;
}

export function SupplementAmountDialog({
  open,
  onOpenChange,
  supplementName,
  icon,
  defaultAmount,
  unit,
  onConfirm,
}: SupplementAmountDialogProps) {
  const [value, setValue] = useState<string>(String(defaultAmount));

  useEffect(() => {
    if (open) setValue(String(defaultAmount));
  }, [open, defaultAmount]);

  const numeric = Number(value.replace(",", "."));
  const isValid = Number.isFinite(numeric) && numeric > 0;

  const submit = () => {
    if (!isValid) return;
    onConfirm(numeric);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{icon ?? "💊"}</span>
            <span>Miktar Belirle — {supplementName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <label className="text-xs text-muted-foreground block">Dozaj miktarı</label>
          <div className="relative">
            <Input
              autoFocus
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValid) {
                  e.preventDefault();
                  submit();
                }
              }}
              className="pr-24 text-base font-semibold"
              placeholder="Örn: 400"
            />
            <Badge
              variant="secondary"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary/15 text-primary border-primary/30 pointer-events-none"
            >
              {unit}
            </Badge>
          </div>
          {!isValid && value !== "" && (
            <p className="text-xs text-destructive">Miktar 0'dan büyük bir sayı olmalı.</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Birim otomatik olarak <span className="font-medium text-foreground">{unit}</span> olarak kilitlendi.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={submit} disabled={!isValid}>
            Onayla & Ekle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSupplementMutations } from "@/hooks/useSupplementMutations";
import { Loader2, Pill } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: string;
  onAssigned: () => void;
}

const TIMING_OPTIONS = [
  { value: "Sabah", label: "☀️ Sabah" },
  { value: "Antrenman Öncesi", label: "⚡ Antrenman Öncesi" },
  { value: "Antrenman Sonrası", label: "💪 Antrenman Sonrası" },
  { value: "Öğün Arası", label: "🕐 Öğün Arası" },
  { value: "Yatmadan Önce", label: "🌙 Yatmadan Önce" },
];

const ICON_OPTIONS = ["💊", "🥤", "🧴", "🐟", "🥩", "🫐", "🍵", "💪"];

export function AssignSupplementDialog({ open, onOpenChange, athleteId, onAssigned }: Props) {
  const { assignSupplement, isLoading } = useSupplementMutations();
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [timing, setTiming] = useState("Sabah");
  const [totalServings, setTotalServings] = useState(30);
  const [icon, setIcon] = useState("💊");

  const resetForm = () => {
    setName("");
    setDosage("");
    setTiming("Sabah");
    setTotalServings(30);
    setIcon("💊");
  };

  const handleSubmit = async () => {
    if (!name.trim() || !dosage.trim()) return;

    const success = await assignSupplement({
      athleteId,
      name: name.trim(),
      dosage: dosage.trim(),
      timing,
      totalServings,
      icon,
    });

    if (success) {
      resetForm();
      onOpenChange(false);
      onAssigned();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="p-1.5 rounded-lg bg-purple-500/10">
              <Pill className="w-4 h-4 text-purple-400" />
            </div>
            Takviye Ata
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Takviye Adı</Label>
            <Input
              placeholder="Örn: Whey Protein, Creatine Monohydrate"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background/50 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Dozaj</Label>
            <Input
              placeholder="Örn: 1 Ölçek, 5g, 2 Kapsül"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="bg-background/50 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Kullanım Zamanı</Label>
            <Select value={timing} onValueChange={setTiming}>
              <SelectTrigger className="bg-background/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMING_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Kutu İçeriği (Servis)</Label>
            <Input
              type="number"
              min={1}
              value={totalServings}
              onChange={(e) => setTotalServings(Number(e.target.value) || 1)}
              className="bg-background/50 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">İkon</Label>
            <div className="flex gap-2 flex-wrap">
              {ICON_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={cn(
                    "w-10 h-10 rounded-lg text-lg flex items-center justify-center transition-all border",
                    icon === emoji
                      ? "border-purple-500 bg-purple-500/15 scale-110 shadow-[0_0_8px_hsl(var(--primary)/0.2)]"
                      : "border-border bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border">
            İptal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !name.trim() || !dosage.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Pill className="w-4 h-4 mr-2" />}
            Ata
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

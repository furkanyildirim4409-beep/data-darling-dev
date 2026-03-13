import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Rocket, Brain, Dumbbell, Flame, Heart } from "lucide-react";

export interface AIGenerateParams {
  goal: string;
  days: number;
  level: string;
  specialNotes: string;
}

interface AIGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (params: AIGenerateParams) => void;
  isGenerating: boolean;
}

const GOALS = [
  { value: "Hipertrofi", label: "Hipertrofi", icon: Dumbbell },
  { value: "Güç", label: "Güç", icon: Flame },
  { value: "Yağ Yakımı", label: "Yağ Yakımı", icon: Heart },
  { value: "Kondisyon", label: "Kondisyon", icon: Sparkles },
];

const LEVELS = [
  { value: "Başlangıç", label: "Başlangıç" },
  { value: "Orta", label: "Orta" },
  { value: "İleri", label: "İleri" },
];

export function AIGeneratorModal({ open, onOpenChange, onGenerate, isGenerating }: AIGeneratorModalProps) {
  const [goal, setGoal] = useState("Hipertrofi");
  const [days, setDays] = useState(3);
  const [level, setLevel] = useState("Orta");
  const [specialNotes, setSpecialNotes] = useState("");

  const handleSubmit = () => {
    onGenerate({ goal, days, level, specialNotes: specialNotes.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-primary/20 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            AI Program Üretici
          </DialogTitle>
          <DialogDescription>
            Sporcunun hedef ve durumuna göre kişiselleştirilmiş program oluştur.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Goal */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Hedef</Label>
            <Select value={goal} onValueChange={setGoal}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOALS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    <span className="flex items-center gap-2">
                      <g.icon className="h-3.5 w-3.5" />
                      {g.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Days */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Gün Sayısı</Label>
              <span className="text-sm font-bold text-primary">{days} gün</span>
            </div>
            <Slider
              value={[days]}
              onValueChange={([v]) => setDays(v)}
              min={1}
              max={7}
              step={1}
            />
          </div>

          {/* Level */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Seviye</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Special Notes */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Özel Notlar</Label>
            <Textarea
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              placeholder="Sakatlık, kan tahlili notları, özel durum... Örn: Kortizol yüksek, antrenman hacmini düşük tut."
              className="min-h-[80px] resize-none text-sm"
              maxLength={500}
            />
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold h-11"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 animate-spin" />
              Üretiliyor...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              Programı Üret
            </span>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

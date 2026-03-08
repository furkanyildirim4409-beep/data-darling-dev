import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookMarked, Dumbbell, Apple, Loader2 } from "lucide-react";

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (meta: { title: string; description: string; difficulty: string; targetGoal: string }) => Promise<void>;
  mode: "exercise" | "nutrition";
  itemCount: number;
  editingProgram?: { name: string; description: string; difficulty?: string; targetGoal?: string } | null;
}

export function SaveTemplateDialog({
  open,
  onOpenChange,
  onSave,
  mode,
  itemCount,
  editingProgram,
}: SaveTemplateDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [targetGoal, setTargetGoal] = useState("");
  const [saving, setSaving] = useState(false);

  const isEditing = !!editingProgram;

  // Pre-fill fields when editing
  useState(() => {
    if (editingProgram) {
      setTitle(editingProgram.name);
      setDescription(editingProgram.description);
      setDifficulty(editingProgram.difficulty ?? "");
      setTargetGoal(editingProgram.targetGoal ?? "");
    }
  });

  // Reset/populate when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && editingProgram) {
      setTitle(editingProgram.name);
      setDescription(editingProgram.description);
      setDifficulty(editingProgram.difficulty ?? "");
      setTargetGoal(editingProgram.targetGoal ?? "");
    } else if (newOpen && !editingProgram) {
      setTitle("");
      setDescription("");
      setDifficulty("");
      setTargetGoal("");
    }
    onOpenChange(newOpen);
  };

  const handleSave = async () => {
    if (!title.trim() || itemCount === 0) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), description: description.trim(), difficulty, targetGoal });
      setTitle("");
      setDescription("");
      setDifficulty("");
      setTargetGoal("");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-primary" />
            {isEditing ? "Programı Güncelle" : "Programı Kaydet"}
          </DialogTitle>
          <DialogDescription>
            Bu {mode === "exercise" ? "antrenman" : "beslenme"} programını {isEditing ? "güncelleyin" : "veritabanına kaydedin"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="program-title">Program Adı *</Label>
            <Input
              id="program-title"
              placeholder={mode === "exercise" ? "Örn: Üst Vücut Günü A" : "Örn: Yüksek Protein Planı"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background/50"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="program-desc">Açıklama</Label>
            <Textarea
              id="program-desc"
              placeholder="Program hakkında kısa açıklama..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-background/50 resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Zorluk</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Başlangıç</SelectItem>
                  <SelectItem value="intermediate">Orta</SelectItem>
                  <SelectItem value="advanced">İleri</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hedef</Label>
              <Select value={targetGoal} onValueChange={setTargetGoal}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hypertrophy">Hipertrofi</SelectItem>
                  <SelectItem value="strength">Güç</SelectItem>
                  <SelectItem value="endurance">Dayanıklılık</SelectItem>
                  <SelectItem value="fat_loss">Yağ Yakımı</SelectItem>
                  <SelectItem value="general">Genel Fitness</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="glass rounded-lg p-3 border border-border">
            <div className="flex items-center gap-3">
              {mode === "exercise" ? (
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-primary" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <Apple className="w-5 h-5 text-success" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium">
                  {mode === "exercise" ? "Antrenman Programı" : "Beslenme Programı"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {itemCount} {mode === "exercise" ? "egzersiz" : "besin"} kaydedilecek
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            İptal
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || itemCount === 0 || saving}
            className="bg-primary text-primary-foreground"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <BookMarked className="w-4 h-4 mr-1.5" />}
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

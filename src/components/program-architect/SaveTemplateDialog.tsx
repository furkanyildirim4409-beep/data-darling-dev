import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookMarked, Dumbbell, Apple } from "lucide-react";

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
  mode: "exercise" | "nutrition";
  itemCount: number;
}

export function SaveTemplateDialog({
  open,
  onOpenChange,
  onSave,
  mode,
  itemCount,
}: SaveTemplateDialogProps) {
  const [templateName, setTemplateName] = useState("");

  const handleSave = () => {
    if (templateName.trim()) {
      onSave(templateName.trim());
      setTemplateName("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-primary" />
            Şablon Olarak Kaydet
          </DialogTitle>
          <DialogDescription>
            Bu {mode === "exercise" ? "antrenman" : "beslenme"} programını şablon olarak kaydedin.
            Daha sonra tekrar kullanabilirsiniz.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Şablon Adı</Label>
            <Input
              id="template-name"
              placeholder={mode === "exercise" ? "Örn: Üst Vücut Günü A" : "Örn: Yüksek Protein Planı"}
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="bg-background/50"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
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
                  {mode === "exercise" ? "Antrenman Şablonu" : "Beslenme Şablonu"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {itemCount} {mode === "exercise" ? "egzersiz" : "besin"} kaydedilecek
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!templateName.trim() || itemCount === 0}
            className="bg-primary text-primary-foreground"
          >
            <BookMarked className="w-4 h-4 mr-1.5" />
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useEffect, useState } from "react";
import { Plus, Pill, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { CoachingPackage, PackageInput } from "@/hooks/useCoachPackages";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPackage?: CoachingPackage | null;
  onSubmit: (values: PackageInput) => Promise<boolean | void>;
}

const DURATION_OPTIONS = [1, 3, 6, 12];

export function PackageFormDialog({ open, onOpenChange, initialPackage, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState<string>("");
  const [duration, setDuration] = useState<number>(1);
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initialPackage?.title ?? "");
      setPrice(initialPackage ? String(initialPackage.price) : "");
      setDuration(initialPackage?.duration_months ?? 1);
      setDescription(initialPackage?.description ?? "");
      setFeatures(initialPackage?.features ?? []);
      setFeatureInput("");
    }
  }, [open, initialPackage]);

  const addFeature = () => {
    const v = featureInput.trim();
    if (!v) return;
    if (features.includes(v)) {
      setFeatureInput("");
      return;
    }
    setFeatures((prev) => [...prev, v]);
    setFeatureInput("");
  };

  const removeFeature = (idx: number) => {
    setFeatures((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Paket adı gerekli");
      return;
    }
    const priceNum = Number(price);
    if (!priceNum || priceNum <= 0) {
      toast.error("Geçerli bir fiyat girin");
      return;
    }
    setSaving(true);
    const ok = await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      price: priceNum,
      duration_months: duration,
      features,
      is_active: initialPackage?.is_active ?? true,
    });
    setSaving(false);
    if (ok !== false) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialPackage ? "Paketi Düzenle" : "Yeni Paket Ekle"}</DialogTitle>
          <DialogDescription>
            Sporcularına sunacağın koçluk paketini yapılandır.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="pkg-title">Paket Adı</Label>
            <Input
              id="pkg-title"
              placeholder="Örn. Elite Performans"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pkg-price">Fiyat (₺)</Label>
              <Input
                id="pkg-price"
                type="number"
                min={0}
                placeholder="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Süre (Ay)</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {DURATION_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} Ay
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pkg-desc">Açıklama</Label>
            <Textarea
              id="pkg-desc"
              placeholder="Paketin kısa tanımı..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Paket Özellikleri</Label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Örn. 7/24 WhatsApp Desteği"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFeature();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addFeature}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {features.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Henüz özellik eklenmedi.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {features.map((f, i) => (
                  <span
                    key={`${f}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs text-foreground"
                  >
                    <Pill className="w-3 h-3 text-primary" />
                    {f}
                    <button
                      type="button"
                      onClick={() => removeFeature(i)}
                      className="ml-1 text-muted-foreground hover:text-destructive"
                      aria-label="Kaldır"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            İptal
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Kaydediliyor..." : initialPackage ? "Güncelle" : "Oluştur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

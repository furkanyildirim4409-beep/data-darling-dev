import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface Feature {
  id: string;
  text: string;
  included: boolean;
}

export interface ProductData {
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number | "unlimited";
  features: Feature[];
  buttonText: string;
  badge?: string;
}

interface ProductEditorProps {
  productType: "digital" | "physical" | "service";
  onProductChange: (product: ProductData) => void;
  initialData?: ProductData;
  onSave?: (product: ProductData) => void;
}

const defaultFeatures: Feature[] = [
  { id: "f1", text: "Haftalık Kontrol", included: true },
  { id: "f2", text: "Video Analiz", included: true },
  { id: "f3", text: "Özel Program", included: true },
  { id: "f4", text: "7/24 Destek", included: true },
];

export function ProductEditor({ productType, onProductChange, initialData, onSave }: ProductEditorProps) {
  const [formData, setFormData] = useState<ProductData>(
    initialData || {
      name: "",
      description: "",
      price: 0,
      currency: "₺",
      stock: "unlimited",
      features: defaultFeatures,
      buttonText: "Satın Al",
      badge: "",
    },
  );

  // Track if initial data has been set
  const [initialized, setInitialized] = useState(false);

  // Only update form when initialData changes (not on every render)
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setInitialized(true);
    }
  }, [initialData?.name, initialData?.price, initialData?.description]);

  // Stable update function - only call onProductChange on blur, not every keystroke
  const handleBlur = useCallback(() => {
    onProductChange(formData);
  }, [formData, onProductChange]);

  const updateField = (field: keyof ProductData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateFeature = (id: string, field: keyof Feature, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
    }));
  };

  const handleFeatureToggle = (id: string, included: boolean) => {
    const newFormData = {
      ...formData,
      features: formData.features.map((f) => (f.id === id ? { ...f, included } : f)),
    };
    setFormData(newFormData);
    // Immediately update preview for toggle changes
    onProductChange(newFormData);
  };

  const addFeature = () => {
    const newFormData = {
      ...formData,
      features: [...formData.features, { id: Date.now().toString(), text: "Yeni Özellik", included: true }],
    };
    setFormData(newFormData);
    onProductChange(newFormData);
  };

  const removeFeature = (id: string) => {
    const newFormData = {
      ...formData,
      features: formData.features.filter((f) => f.id !== id),
    };
    setFormData(newFormData);
    onProductChange(newFormData);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">
            1
          </span>
          Temel Bilgiler
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Ürün Adı</Label>
            <Input
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              onBlur={handleBlur}
              className="mt-1 bg-background/50"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Açıklama</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              onBlur={handleBlur}
              className="mt-1 bg-background/50 resize-none"
              rows={2}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Fiyat (₺)</Label>
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => updateField("price", Number(e.target.value))}
              onBlur={handleBlur}
              className="mt-1 bg-background/50"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Rozet</Label>
            <Input
              value={formData.badge || ""}
              onChange={(e) => updateField("badge", e.target.value)}
              onBlur={handleBlur}
              className="mt-1 bg-background/50"
              placeholder="Örn: Popüler"
            />
          </div>
        </div>
      </div>

      {productType === "service" && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">
              2
            </span>
            Özellikler
          </h3>
          <div className="space-y-2">
            {formData.features.map((feature) => (
              <div
                key={feature.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border",
                  feature.included ? "bg-primary/5 border-primary/20" : "bg-muted/30 opacity-60",
                )}
              >
                <Input
                  value={feature.text}
                  onChange={(e) => updateFeature(feature.id, "text", e.target.value)}
                  onBlur={handleBlur}
                  className="flex-1 h-8 text-sm bg-transparent border-none"
                />
                <Switch 
                  checked={feature.included} 
                  onCheckedChange={(c) => handleFeatureToggle(feature.id, c)} 
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFeature(feature.id)}
                  className="h-7 w-7 text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addFeature}
              className="w-full border-dashed"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Özellik Ekle
            </Button>
          </div>
        </div>
      )}

      <Button onClick={() => onSave && onSave(formData)} className="w-full bg-primary text-primary-foreground">
        <Save className="w-4 h-4 mr-2" /> Değişiklikleri Kaydet
      </Button>
    </div>
  );
}

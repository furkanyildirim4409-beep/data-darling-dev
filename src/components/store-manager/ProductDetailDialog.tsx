import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Image, 
  DollarSign, 
  Search, 
  Upload, 
  Trash2, 
  Plus, 
  Save,
  Package,
  TrendingUp,
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Feature {
  id: string;
  text: string;
  included: boolean;
}

export interface ProductDetailData {
  id: string;
  type: "digital" | "physical" | "service";
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number | "unlimited";
  features: Feature[];
  buttonText: string;
  badge?: string;
  sales: number;
  revenue: number;
  // SEO fields
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  // Images
  images?: string[];
}

interface ProductDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductDetailData | null;
  onSave: (product: ProductDetailData) => void;
}

export function ProductDetailDialog({ open, onOpenChange, product, onSave }: ProductDetailDialogProps) {
  const [activeTab, setActiveTab] = useState("images");
  const [editedProduct, setEditedProduct] = useState<ProductDetailData | null>(product);

  // Update local state when product changes
  if (product && editedProduct?.id !== product.id) {
    setEditedProduct({
      ...product,
      seoTitle: product.seoTitle || product.name,
      seoDescription: product.seoDescription || product.description,
      seoKeywords: product.seoKeywords || "",
      images: product.images || [
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop",
      ],
    });
  }

  if (!editedProduct) return null;

  const updateField = (field: keyof ProductDetailData, value: unknown) => {
    setEditedProduct(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleSave = () => {
    if (editedProduct) {
      onSave(editedProduct);
      toast({
        title: "Ürün Güncellendi",
        description: `"${editedProduct.name}" başarıyla kaydedildi.`,
      });
      onOpenChange(false);
    }
  };

  const handleAddImage = () => {
    const images = editedProduct.images || [];
    updateField("images", [...images, "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop"]);
  };

  const handleRemoveImage = (index: number) => {
    const images = editedProduct.images || [];
    updateField("images", images.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-card border-border max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">{editedProduct.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {editedProduct.type === "digital" ? "Dijital" : 
                     editedProduct.type === "physical" ? "Fiziksel" : "Hizmet"}
                  </Badge>
                  {editedProduct.badge && (
                    <Badge className="text-xs bg-primary/20 text-primary border-primary/30">
                      {editedProduct.badge}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-mono text-foreground">
                {editedProduct.price.toLocaleString("tr-TR")} ₺
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                <TrendingUp className="w-3 h-3 text-success" />
                {editedProduct.sales} satış
              </p>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="bg-muted/50 p-1 w-full justify-start">
            <TabsTrigger value="images" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Görseller
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Fiyatlandırma
            </TabsTrigger>
            <TabsTrigger value="seo" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              SEO
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            {/* Images Tab */}
            <TabsContent value="images" className="mt-0 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {(editedProduct.images || []).map((image, index) => (
                  <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                    <img src={image} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {index === 0 && (
                      <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px]">
                        Ana Görsel
                      </Badge>
                    )}
                  </div>
                ))}
                <button
                  onClick={handleAddImage}
                  className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 transition-colors"
                >
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Görsel Ekle</span>
                </button>
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground">
                  💡 İpucu: Ana görsel, ürün listesinde ve önizlemede gösterilir. 
                  Sürükleyerek sıralayabilirsiniz.
                </p>
              </div>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Fiyat (₺)</Label>
                  <Input
                    type="number"
                    value={editedProduct.price}
                    onChange={(e) => updateField("price", Number(e.target.value))}
                    className="mt-1 bg-background/50 font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Stok Durumu</Label>
                  <div className="mt-1 flex items-center gap-2">
                    {editedProduct.stock === "unlimited" ? (
                      <Badge className="bg-success/20 text-success border-success/30">Sınırsız</Badge>
                    ) : (
                      <Input
                        type="number"
                        value={editedProduct.stock as number}
                        onChange={(e) => updateField("stock", Number(e.target.value))}
                        className="bg-background/50 font-mono"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Rozet / Etiket</Label>
                <Input
                  value={editedProduct.badge || ""}
                  onChange={(e) => updateField("badge", e.target.value)}
                  placeholder="Örn: En Popüler, Yeni, İndirimli"
                  className="mt-1 bg-background/50"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Buton Metni</Label>
                <Input
                  value={editedProduct.buttonText}
                  onChange={(e) => updateField("buttonText", e.target.value)}
                  placeholder="Satın Al"
                  className="mt-1 bg-background/50"
                />
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Toplam Satış</span>
                  <span className="font-mono font-bold">{editedProduct.sales}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Toplam Gelir</span>
                  <span className="font-mono font-bold text-primary">
                    {editedProduct.revenue.toLocaleString("tr-TR")} ₺
                  </span>
                </div>
              </div>
            </TabsContent>

            {/* SEO Tab */}
            <TabsContent value="seo" className="mt-0 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-2">
                  <Tag className="w-3 h-3" />
                  SEO Başlığı
                </Label>
                <Input
                  value={editedProduct.seoTitle || ""}
                  onChange={(e) => updateField("seoTitle", e.target.value)}
                  placeholder="Arama motorlarında görünecek başlık"
                  className="mt-1 bg-background/50"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {(editedProduct.seoTitle || "").length}/60 karakter
                </p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">SEO Açıklaması</Label>
                <Textarea
                  value={editedProduct.seoDescription || ""}
                  onChange={(e) => updateField("seoDescription", e.target.value)}
                  placeholder="Arama sonuçlarında görünecek açıklama"
                  className="mt-1 bg-background/50 resize-none"
                  rows={3}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {(editedProduct.seoDescription || "").length}/160 karakter
                </p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Anahtar Kelimeler</Label>
                <Input
                  value={editedProduct.seoKeywords || ""}
                  onChange={(e) => updateField("seoKeywords", e.target.value)}
                  placeholder="fitness, koçluk, antrenman (virgülle ayırın)"
                  className="mt-1 bg-background/50"
                />
              </div>

              {/* SEO Preview */}
              <div className="p-4 rounded-lg bg-background border border-border">
                <p className="text-xs text-muted-foreground mb-2">Google Önizleme:</p>
                <div className="space-y-1">
                  <p className="text-info text-sm hover:underline cursor-pointer">
                    {editedProduct.seoTitle || editedProduct.name}
                  </p>
                  <p className="text-[10px] text-success">
                    dynabolic.com/store/{editedProduct.id}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {editedProduct.seoDescription || editedProduct.description}
                  </p>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="border-t border-border pt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground">
            <Save className="w-4 h-4 mr-2" />
            Kaydet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

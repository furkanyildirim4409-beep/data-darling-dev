import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Box,
  Cloud,
  ImagePlus,
  Infinity as InfinityIcon,
  Loader2,
  Package,
  ShieldAlert,
  Store,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useCoachProducts,
  useCreateProduct,
  useUpdateProductStatus,
} from "@/hooks/useStoreMutations";

const CATEGORIES = ["Takviye", "Ekipman", "Dijital İçerik", "Giyim"] as const;

/** Common Shopify Taxonomy categories for coach products.
 *  IDs are real Shopify Standard Product Taxonomy GIDs. */
const SHOPIFY_CATEGORIES: { id: string; label: string }[] = [
  {
    id: "gid://shopify/TaxonomyCategory/sg-4-7-12",
    label: "Sporting Goods › Exercise & Fitness › Exercise Equipment",
  },
  {
    id: "gid://shopify/TaxonomyCategory/sg-4-7-17",
    label: "Sporting Goods › Exercise & Fitness › Yoga & Pilates",
  },
  {
    id: "gid://shopify/TaxonomyCategory/hb-2-3-3",
    label: "Health & Beauty › Health Care › Nutritional Supplements",
  },
  {
    id: "gid://shopify/TaxonomyCategory/aa-1-13-1",
    label: "Apparel & Accessories › Clothing › Activewear",
  },
  {
    id: "gid://shopify/TaxonomyCategory/me-1-3",
    label: "Media › Books (Dijital İçerik)",
  },
  {
    id: "gid://shopify/TaxonomyCategory/me-2-1",
    label: "Media › Online Courses (Dijital İçerik)",
  },
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function StoreManager() {
  const { canManageStore } = usePermissions();
  const { data: products, isLoading } = useCoachProducts();
  const { mutateAsync: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutate: updateStatus } = useUpdateProductStatus();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [productType, setProductType] = useState<"physical" | "digital">("physical");
  const [stockQty, setStockQty] = useState<string>("");
  const [shopifyCategoryId, setShopifyCategoryId] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice("");
    setCategory("");
    setImageFile(null);
    setImagePreview(null);
    setProductType("physical");
    setStockQty("");
    setShopifyCategoryId("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Sadece görsel dosyalar yüklenebilir.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Görsel 5 MB'dan büyük olamaz.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const isDigital = productType === "digital";
  // Physical: always track inventory and require stock qty.
  // Digital: never tracked (unlimited).
  const trackInventory = !isDigital;
  const stockQuantity = isDigital
    ? null
    : stockQty !== ""
    ? Math.max(0, Number(stockQty))
    : null;

  const canSubmit =
    !!title.trim() &&
    !!price &&
    Number(price) > 0 &&
    !!category &&
    !!imageFile &&
    !isCreating &&
    (isDigital || (stockQty !== "" && Number(stockQty) >= 0));

  const handleSubmit = async () => {
    if (!canSubmit || !imageFile) return;
    try {
      await createProduct({
        title: title.trim(),
        description: description.trim() || undefined,
        price: Number(price),
        category,
        imageFile,
        productType,
        trackInventory,
        stockQuantity,
        shopifyCategoryId: shopifyCategoryId || null,
      });
      resetForm();
    } catch {
      // toast handled in hook
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <Store className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Mağaza Yönetimi
          </h1>
          <p className="text-muted-foreground mt-1">
            Ürünlerinizi Shopify ile senkronize ederek yayınlayın
          </p>
        </div>
      </div>

      {/* Upload Form */}
      {canManageStore ? (
        <div className="glass rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-5">
            Yeni Ürün Yükle
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
            {/* Image dropzone */}
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block">
                Görsel
              </Label>
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                className={`relative aspect-square rounded-xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden flex items-center justify-center ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/30 hover:border-primary/50"
                }`}
              >
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Önizleme"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageFile(null);
                        setImagePreview(null);
                        if (inputRef.current) inputRef.current.value = "";
                      }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground p-3 text-center">
                    <ImagePlus className="w-8 h-8 mb-2" />
                    <p className="text-xs font-medium">Görsel sürükleyin</p>
                    <p className="text-[10px] mt-1 opacity-70">veya tıklayın · max 5MB</p>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Başlık
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Whey Protein 2kg"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Açıklama
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ürün hakkında kısa bir açıklama..."
                  className="mt-1.5 min-h-[88px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price" className="text-xs uppercase tracking-wide text-muted-foreground">
                    Fiyat (₺)
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Kategori
                  </Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Product type segmented buttons */}
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Ürün Tipi
                </Label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setProductType("physical")}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      productType === "physical"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <Box className="w-4 h-4" />
                    Fiziksel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProductType("digital");
                    }}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      productType === "digital"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <Cloud className="w-4 h-4" />
                    Dijital
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {isDigital
                    ? "Dijital ürünler kargo gerektirmez, otomatik sınırsız stok."
                    : "Fiziksel ürünler kargolanır ve stok takibi yapılabilir."}
                </p>
              </div>

              {/* Stock control (physical only) — required, no unlimited option */}
              {!isDigital && (
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
                  <div>
                    <Label htmlFor="stock" className="text-xs uppercase tracking-wide text-muted-foreground">
                      Stok Adedi <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      step="1"
                      value={stockQty}
                      onChange={(e) => setStockQty(e.target.value)}
                      placeholder="Örn: 25"
                      className="mt-1.5"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      Fiziksel ürünlerde stok takibi zorunludur.
                    </p>
                  </div>
                </div>
              )}

              {/* Shopify taxonomy category (optional) */}
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Shopify Kategorisi (opsiyonel)
                </Label>
                <Select
                  value={shopifyCategoryId || "__none__"}
                  onValueChange={(v) => setShopifyCategoryId(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Shopify kategorisi seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Kategori atanmasın</SelectItem>
                    {SHOPIFY_CATEGORIES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Shopify'ın resmi taksonomisinde ürünü kategorize eder (SEO/Markets/vergi için).
                </p>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full sm:w-auto"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Yayınlanıyor...
                  </>
                ) : (
                  "Yayınla ve Shopify'a Gönder"
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass rounded-xl border border-border p-10 flex flex-col items-center justify-center text-muted-foreground">
          <ShieldAlert className="w-12 h-12 mb-4 opacity-50 text-warning" />
          <p className="text-sm font-medium">Bu modülü düzenleme yetkiniz yok</p>
          <p className="text-xs mt-1">Yönetici ile iletişime geçin</p>
        </div>
      )}

      {/* My Products Grid */}
      <div className="glass rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">
            Ürünlerim {products && products.length > 0 ? `(${products.length})` : ""}
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : !products || products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
            <Package className="w-12 h-12 mb-4 opacity-40" />
            <p className="text-sm font-medium">Henüz ürün eklemediniz</p>
            <p className="text-xs mt-1">
              Yukarıdan ilk ürününüzü oluşturun ve Shopify'a yayınlayın.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p: any) => (
              <div
                key={p.id}
                className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors"
              >
                <div className="aspect-square bg-muted overflow-hidden">
                  <img
                    src={p.image_url}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
                      {p.title}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-bold text-primary">
                      ₺{Number(p.price).toLocaleString("tr-TR")}
                    </span>
                    {p.category && (
                      <Badge variant="secondary" className="text-[10px]">
                        {p.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    {p.product_type === "digital" ? (
                      <>
                        <Cloud className="w-3 h-3" /> Dijital
                        <span className="opacity-60">·</span>
                        <InfinityIcon className="w-3 h-3" />
                      </>
                    ) : (
                      <>
                        <Box className="w-3 h-3" /> Fiziksel
                        <span className="opacity-60">·</span>
                        {p.track_inventory && p.stock_quantity !== null ? (
                          <span>{p.stock_quantity} adet</span>
                        ) : (
                          <InfinityIcon className="w-3 h-3" />
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {p.is_active ? "Aktif" : "Pasif"}
                    </span>
                    <Switch
                      checked={!!p.is_active}
                      disabled={!canManageStore}
                      onCheckedChange={(checked) =>
                        updateStatus({ product_id: p.id, is_active: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

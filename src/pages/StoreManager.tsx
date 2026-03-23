import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ProductEditor, ProductData } from "@/components/store-manager/ProductEditor";
import { ProductList, StoreProduct } from "@/components/store-manager/ProductList";
import { ProductDetailDialog } from "@/components/store-manager/ProductDetailDialog";
import { MobilePreview } from "@/components/store-manager/MobilePreview";
import { SalesChart } from "@/components/store-manager/SalesChart";
import { BookOpen, Package, UserCheck, Plus, ShieldAlert } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

// Mock products data
const mockProducts: StoreProduct[] = [
  {
    id: "prod-1",
    type: "service",
    name: "Premium Koçluk Paketi",
    description: "Birebir koçluk, haftalık kontroller ve özel program",
    price: 3500,
    currency: "₺",
    stock: "unlimited",
    features: [
      { id: "f1", text: "Haftalık Video Görüşme", included: true },
      { id: "f2", text: "Detaylı Form Analizi", included: true },
      { id: "f3", text: "Kişisel Antrenman Programı", included: true },
      { id: "f4", text: "Beslenme Planı", included: true },
      { id: "f5", text: "7/24 WhatsApp Destek", included: true },
    ],
    buttonText: "Hemen Başla",
    badge: "En Popüler",
    sales: 47,
    revenue: 164500,
  },
  {
    id: "prod-2",
    type: "service",
    name: "Başlangıç Koçluk Paketi",
    description: "Temel koçluk desteği ve program takibi",
    price: 1500,
    currency: "₺",
    stock: "unlimited",
    features: [
      { id: "f1", text: "Aylık Video Görüşme", included: true },
      { id: "f2", text: "Antrenman Programı", included: true },
      { id: "f3", text: "Haftalık Check-in", included: true },
      { id: "f4", text: "Beslenme Önerileri", included: false },
    ],
    buttonText: "Başla",
    badge: "Yeni Başlayanlar",
    sales: 89,
    revenue: 133500,
  },
  {
    id: "prod-3",
    type: "digital",
    name: "Vücut Geliştirme Rehberi",
    description: "A'dan Z'ye vücut geliştirme e-kitabı - 250+ sayfa",
    price: 199,
    currency: "₺",
    stock: "unlimited",
    features: [],
    buttonText: "Satın Al",
    badge: "PDF + Video",
    sales: 234,
    revenue: 46566,
  },
  {
    id: "prod-4",
    type: "digital",
    name: "Beslenme Temelleri E-Kitap",
    description: "Makro hesaplama, öğün planları ve 50+ tarif",
    price: 149,
    currency: "₺",
    stock: "unlimited",
    features: [],
    buttonText: "İndir",
    badge: "Bestseller",
    sales: 312,
    revenue: 46488,
  },
  {
    id: "prod-5",
    type: "physical",
    name: "Pro Direnç Bandı Seti",
    description: "5 farklı direnç seviyesi, taşıma çantası dahil",
    price: 449,
    currency: "₺",
    stock: 28,
    features: [],
    buttonText: "Sepete Ekle",
    badge: "Ücretsiz Kargo",
    sales: 156,
    revenue: 70044,
  },
];

const defaultProduct: ProductData = {
  name: "",
  description: "",
  price: 0,
  currency: "₺",
  stock: "unlimited",
  features: [],
  buttonText: "Satın Al",
  badge: "",
};

export default function StoreManager() {
  const { canManageStore } = usePermissions();
  const [productType, setProductType] = useState<"digital" | "physical" | "service">("service");
  const [products, setProducts] = useState<StoreProduct[]>(mockProducts);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductData>(defaultProduct);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<StoreProduct | null>(null);

  // Update editingProduct when selectedProduct changes
  useEffect(() => {
    if (selectedProduct) {
      setEditingProduct({
        name: selectedProduct.name,
        description: selectedProduct.description,
        price: selectedProduct.price,
        currency: selectedProduct.currency,
        stock: selectedProduct.stock,
        features: selectedProduct.features,
        buttonText: selectedProduct.buttonText,
        badge: selectedProduct.badge,
      });
      setIsCreatingNew(false);
    }
  }, [selectedProduct]);

  // Stable callback for product changes - prevents render loop
  const handleProductChange = useCallback((newProduct: ProductData) => {
    setEditingProduct(newProduct);
  }, []);

  const handleSaveProduct = (productData: ProductData) => {
    if (selectedProduct && !isCreatingNew) {
      // Update existing product
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id
            ? { ...p, ...productData }
            : p
        )
      );
      toast({
        title: "Ürün Güncellendi",
        description: `"${productData.name}" başarıyla güncellendi.`,
      });
    } else {
      // Create new product
      const newProduct: StoreProduct = {
        id: `prod-${Date.now()}`,
        type: productType,
        ...productData,
        sales: 0,
        revenue: 0,
      };
      setProducts((prev) => [...prev, newProduct]);
      toast({
        title: "Ürün Eklendi",
        description: `"${productData.name}" mağazaya eklendi.`,
      });
    }
    setSelectedProduct(null);
    setIsCreatingNew(false);
  };

  const handleSelectProduct = (product: StoreProduct) => {
    setSelectedProduct(product);
    setProductType(product.type);
  };

  const handleOpenDetail = (product: StoreProduct) => {
    setDetailProduct(product);
    setDetailDialogOpen(true);
  };

  const handleSaveDetail = (updatedProduct: StoreProduct) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
  };

  const handleDeleteProduct = (id: string) => {
    const product = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (selectedProduct?.id === id) {
      setSelectedProduct(null);
    }
    toast({
      title: "Ürün Silindi",
      description: `"${product?.name}" mağazadan kaldırıldı.`,
      variant: "destructive",
    });
  };

  const handleNewProduct = () => {
    setSelectedProduct(null);
    setIsCreatingNew(true);
    setEditingProduct({
      ...defaultProduct,
      name: productType === "service" ? "Yeni Koçluk Paketi" :
            productType === "digital" ? "Yeni E-Kitap" : "Yeni Ürün",
      features: productType === "service" ? [
        { id: "f1", text: "Özellik 1", included: true },
        { id: "f2", text: "Özellik 2", included: true },
      ] : [],
    });
  };

  const handleTabChange = (value: string) => {
    const type = value as "digital" | "physical" | "service";
    setProductType(type);
    setSelectedProduct(null);
    setIsCreatingNew(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Mağaza ve Hizmet Yönetimi
        </h1>
        <p className="text-muted-foreground mt-1">
          Ürün ve hizmetlerinizi düzenleyin, satışları takip edin
        </p>
      </div>

      {/* Product Type Tabs */}
      <Tabs value={productType} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="digital" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Dijital (E-Kitap)
            </TabsTrigger>
            <TabsTrigger value="physical" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Fiziksel (Ekipman)
            </TabsTrigger>
            <TabsTrigger value="service" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Hizmet (Koçluk)
            </TabsTrigger>
          </TabsList>

          {canManageStore && (
            <Button onClick={handleNewProduct} className="bg-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-1.5" />
              Yeni Ürün Ekle
            </Button>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Left - Product List */}
          <div className="lg:col-span-3">
            <div className="glass rounded-xl border border-border p-5">
              <h2 className="text-lg font-semibold text-foreground mb-4">Ürün Listesi</h2>
              <ScrollArea className="h-[calc(100vh-340px)]">
                <ProductList
                  products={products}
                  selectedProductId={selectedProduct?.id || null}
                  onSelectProduct={handleSelectProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onOpenDetail={handleOpenDetail}
                  filterType={productType}
                  readOnly={!canManageStore}
                />
              </ScrollArea>
            </div>
          </div>

          {/* Center - Editor */}
          <div className="lg:col-span-4">
            <div className="glass rounded-xl border border-border p-5">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                {isCreatingNew ? "Yeni Ürün Oluştur" : selectedProduct ? "Ürünü Düzenle" : "Ürün Editörü"}
              </h2>
              <ScrollArea className="h-[calc(100vh-340px)]">
                {!canManageStore ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <ShieldAlert className="w-12 h-12 mb-4 opacity-50 text-warning" />
                    <p className="text-sm text-center font-medium">
                      Bu modülü düzenleme yetkiniz yok
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Yönetici ile iletişime geçin
                    </p>
                  </div>
                ) : (selectedProduct || isCreatingNew) ? (
                  <ProductEditor 
                    productType={productType} 
                    onProductChange={handleProductChange}
                    initialData={editingProduct}
                    onSave={handleSaveProduct}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Package className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-sm text-center">
                      Düzenlemek için listeden bir ürün seçin
                      <br />
                      veya yeni ürün oluşturun
                    </p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Right - Mobile Preview + Sales */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass rounded-xl border border-border p-5 flex flex-col items-center justify-center min-h-[400px]">
              <MobilePreview product={editingProduct} productType={productType} />
            </div>
            <div className="glass rounded-xl border border-border p-5">
              <h2 className="text-lg font-semibold text-foreground mb-4">Satış Verileri</h2>
              <SalesChart />
            </div>
          </div>
        </div>
      </Tabs>

      {/* Product Detail Dialog */}
      <ProductDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        product={detailProduct}
        onSave={handleSaveDetail}
      />
    </div>
  );
}
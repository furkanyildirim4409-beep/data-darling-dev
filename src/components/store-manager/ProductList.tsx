import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, BookOpen, Package, UserCheck, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductData } from "./ProductEditor";

export interface StoreProduct extends ProductData {
  id: string;
  type: "digital" | "physical" | "service";
  sales: number;
  revenue: number;
  // SEO fields
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  images?: string[];
}

interface ProductListProps {
  products: StoreProduct[];
  selectedProductId: string | null;
  onSelectProduct: (product: StoreProduct) => void;
  onDeleteProduct: (id: string) => void;
  onOpenDetail?: (product: StoreProduct) => void;
  filterType: "digital" | "physical" | "service";
  readOnly?: boolean;
}

const typeIcons = {
  digital: BookOpen,
  physical: Package,
  service: UserCheck,
};

const typeLabels = {
  digital: "E-Kitap",
  physical: "Ekipman",
  service: "Koçluk",
};

export function ProductList({ 
  products, 
  selectedProductId, 
  onSelectProduct, 
  onDeleteProduct,
  onOpenDetail,
  filterType 
}: ProductListProps) {
  const filteredProducts = products.filter((p) => p.type === filterType);

  if (filteredProducts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Bu kategoride ürün yok</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filteredProducts.map((product) => {
        const Icon = typeIcons[product.type];
        return (
          <div
            key={product.id}
            className={cn(
              "glass rounded-lg p-3 border transition-all cursor-pointer group",
              selectedProductId === product.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
            onClick={() => onSelectProduct(product)}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                product.type === "service" ? "bg-primary/20 text-primary" :
                product.type === "digital" ? "bg-info/20 text-info" :
                "bg-warning/20 text-warning"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                  {product.badge && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary/70 shrink-0">
                      {product.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{product.description}</p>
                
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm font-bold text-primary">
                    {product.price.toLocaleString("tr-TR")} ₺
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {product.sales} satış
                  </Badge>
                  <span className="text-xs text-success">
                    {product.revenue.toLocaleString("tr-TR")} ₺
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onOpenDetail && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-info hover:text-info hover:bg-info/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetail(product);
                    }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectProduct(product);
                  }}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProduct(product.id);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
import { ProductData } from "./ProductEditor";
import { Check, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobilePreviewProps {
  product: ProductData;
  productType: "digital" | "physical" | "service";
}

export function MobilePreview({ product, productType }: MobilePreviewProps) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-xs text-muted-foreground mb-3">Canlı Önizleme</p>
      
      {/* Phone Frame */}
      <div className="relative">
        {/* Phone Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-10 flex items-center justify-center">
          <div className="w-12 h-3 bg-gray-800 rounded-full" />
        </div>

        {/* Phone Body */}
        <div className="w-[280px] h-[560px] bg-black rounded-[40px] p-3 shadow-2xl shadow-primary/10 border-4 border-gray-800">
          {/* Screen */}
          <div className="w-full h-full bg-gradient-to-b from-gray-900 to-black rounded-[32px] overflow-hidden flex flex-col">
            {/* Status Bar */}
            <div className="h-8 flex items-center justify-between px-6 text-[10px] text-white/60">
              <span>09:41</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-2 border border-white/40 rounded-sm">
                  <div className="w-3/4 h-full bg-primary rounded-sm" />
                </div>
              </div>
            </div>

            {/* App Header */}
            <div className="px-4 py-3">
              <h3 className="text-white/90 font-bold text-lg">Mağaza</h3>
            </div>

            {/* Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin">
              {/* Coaching Card */}
              <div className="glass rounded-2xl border border-primary/20 overflow-hidden">
                {/* Card Header with Badge */}
                {product.badge && (
                  <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-xs font-semibold text-primary">{product.badge}</span>
                  </div>
                )}

                {/* Card Content */}
                <div className="p-5 space-y-4">
                  {/* Title & Description */}
                  <div className="text-center">
                    <h4 className="text-white font-bold text-base">{product.name}</h4>
                    <p className="text-white/50 text-xs mt-1">{product.description}</p>
                  </div>

                  {/* Price */}
                  <div className="text-center">
                    <div className="inline-flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">
                        {product.price.toLocaleString("tr-TR")}
                      </span>
                      <span className="text-lg text-white/60">{product.currency}</span>
                    </div>
                    {productType === "service" && (
                      <p className="text-xs text-white/40 mt-0.5">/aylık</p>
                    )}
                  </div>

                  {/* Features List */}
                  {productType === "service" && (
                    <div className="space-y-2 pt-2">
                      {product.features.map((feature) => (
                        <div
                          key={feature.id}
                          className={cn(
                            "flex items-center gap-2 text-xs",
                            feature.included ? "text-white/80" : "text-white/30 line-through"
                          )}
                        >
                          {feature.included ? (
                            <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-white/30 shrink-0" />
                          )}
                          <span>{feature.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stock indicator for physical */}
                  {productType === "physical" && product.stock !== "unlimited" && (
                    <p className="text-xs text-center text-warning">
                      Stokta {product.stock} adet kaldı
                    </p>
                  )}

                  {/* CTA Button */}
                  <button className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl text-sm hover:bg-primary/90 transition-colors mt-2">
                    {product.buttonText}
                  </button>
                </div>
              </div>

              {/* Preview Label */}
              <div className="mt-4 text-center">
                <span className="text-[10px] text-white/30 uppercase tracking-wider">
                  Mobil Görünüm Önizlemesi
                </span>
              </div>
            </div>

            {/* Bottom Nav */}
            <div className="h-14 border-t border-white/10 flex items-center justify-around px-6">
              {["Ana Sayfa", "Mağaza", "Profil"].map((item, i) => (
                <div
                  key={item}
                  className={cn(
                    "text-[9px] text-center",
                    i === 1 ? "text-primary" : "text-white/40"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full mx-auto mb-0.5",
                    i === 1 ? "bg-primary/20" : "bg-white/10"
                  )} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

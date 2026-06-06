import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Package,
  User,
  Phone,
  Mail,
  MapPin,
  Truck,
  ExternalLink,
  Printer,
  CheckCircle2,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import PackingSlipPrintView from "./PackingSlipPrintView";

interface OrderItem {
  id: string;
  user_id: string | null;
  coach_id?: string | null;
  items: any;
  total_price: number;
  total_coins_used: number;
  status: string;
  created_at: string;
  order_type: string;
  external_reference_id: string | null;
  shipping_address: any;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier_name: string | null;
  updated_at: string;
  expires_at: string | null;
}

interface Props {
  order: OrderItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Extracts a variant label like "Mavi, L" from any of the shapes
// products may use in the items[] JSONB payload.
const extractVariantLabel = (it: any): string | null => {
  if (!it || typeof it !== "object") return null;
  const collect: string[] = [];

  const pushVals = (input: any) => {
    if (!input) return;
    if (Array.isArray(input)) {
      for (const opt of input) {
        if (!opt) continue;
        if (typeof opt === "string") collect.push(opt);
        else if (typeof opt === "object") {
          const v = opt.value ?? opt.name ?? opt.label;
          if (v) collect.push(String(v));
        }
      }
    } else if (typeof input === "object") {
      for (const v of Object.values(input)) {
        if (v) collect.push(String(v));
      }
    } else if (typeof input === "string") {
      collect.push(input);
    }
  };

  pushVals(it.selectedOptions);
  if (collect.length === 0) pushVals(it.options);
  if (collect.length === 0) pushVals(it.variant);
  if (collect.length === 0 && it.variant_title) collect.push(String(it.variant_title));
  if (collect.length === 0 && it.size) collect.push(String(it.size));
  if (collect.length === 0 && it.color) collect.push(String(it.color));

  const cleaned = collect
    .map((s) => s.trim())
    .filter((s) => s && s.toLowerCase() !== "default title");
  return cleaned.length ? cleaned.join(", ") : null;
};

const shortId = (id: string) =>
  `#ORD-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;

const formatPrice = (n: number) =>
  `₺${Number(n ?? 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const STATUS_LABELS: Record<string, string> = {
  processing: "Hazırlanıyor",
  shipped: "Kargolandı",
  completed: "Teslim Edildi",
  cancelled: "İptal Edildi",
  refunded: "İade Edildi",
};

const getFunctionErrorMessage = async (error: any) => {
  const fallback = error?.message ?? "Bilinmeyen hata";
  try {
    const response = error?.context?.response;
    const text = await response?.text?.();
    if (!text) return fallback;
    const parsed = JSON.parse(text);
    return parsed?.message || parsed?.error || fallback;
  } catch {
    return fallback;
  }
};

export default function OrderFulfillmentSheet({
  order,
  open,
  onOpenChange,
}: Props) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const coachName = profile?.full_name ?? "Dynabolic Coach";
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [productDetailItem, setProductDetailItem] = useState<any | null>(null);

  const handlePrint = () => {
    requestAnimationFrame(() => window.print());
  };

  useEffect(() => {
    if (order) {
      setTrackingNumber(order.tracking_number ?? "");
      setTrackingUrl(order.tracking_url ?? "");
    } else {
      setTrackingNumber("");
      setTrackingUrl("");
    }
  }, [order]);

  const items: any[] = useMemo(
    () => (order && Array.isArray(order.items) ? order.items : []),
    [order]
  );

  // Compute discount: sum(regular_price * qty) - sum(price * qty),
  // falling back to explicit discount fields on items or shipping_address.
  const discount = useMemo(() => {
    let explicit = 0;
    for (const it of items) {
      const d = Number(it?.discount ?? it?.discount_amount ?? 0);
      if (Number.isFinite(d) && d > 0) explicit += d;
    }
    const addrDiscount = Number(
      (order?.shipping_address as any)?.discount ??
        (order?.shipping_address as any)?.discount_amount ??
        0
    );
    if (Number.isFinite(addrDiscount) && addrDiscount > 0) explicit += addrDiscount;
    if (explicit > 0) return explicit;

    let regularSum = 0;
    let paidSum = 0;
    for (const it of items) {
      const qty = Number(it?.quantity ?? 1);
      const price = Number(it?.price ?? 0);
      const regular = Number(
        it?.regular_price ?? it?.compare_at_price ?? it?.original_price ?? price
      );
      regularSum += regular * qty;
      paidSum += price * qty;
    }
    const delta = regularSum - paidSum;
    return delta > 0.001 ? delta : 0;
  }, [items, order?.shipping_address]);

  if (!order) return null;

  const addr = order.shipping_address ?? {};
  const fullName =
    [addr.firstName, addr.lastName].filter(Boolean).join(" ") ||
    addr.name ||
    "—";
  const phone = addr.phone ?? "—";
  const email = addr.email ?? "—";
  const street = [addr.address1, addr.address2].filter(Boolean).join(" ");
  const cityLine = [addr.zip, addr.city, addr.province, addr.country]
    .filter(Boolean)
    .join(", ");

  const handleSubmit = async () => {
    if (!trackingNumber.trim()) {
      toast.error("Lütfen kargo takip numarası girin.");
      return;
    }
    setIsSubmitting(true);
    try {
      const rawUrl = trackingUrl.trim();
      const normalizedUrl = rawUrl
        ? rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
          ? rawUrl
          : `https://${rawUrl}`
        : null;

      const { error } = await supabase.functions.invoke("handle-universal-orders", {
        body: {
          action: "ship",
          orderId: order.id,
          trackingNumber: trackingNumber.trim(),
          trackingUrl: normalizedUrl,
          carrierName: order.carrier_name || "Other",
        },
      });
      if (error) throw error;
      toast.success("Sipariş başarıyla kargolandı!");
      await queryClient.invalidateQueries({ queryKey: ["store-orders"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("İşlem başarısız: " + await getFunctionErrorMessage(e));
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleMarkDelivered = async () => {
    setIsCompleting(true);
    try {
      const { error } = await supabase.functions.invoke("handle-universal-orders", {
        body: {
          action: "deliver",
          orderId: order.id,
        },
      });
      if (error) throw error;
      toast.success("Sipariş teslim edildi olarak işaretlendi!");
      await queryClient.invalidateQueries({ queryKey: ["store-orders"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("İşlem başarısız: " + await getFunctionErrorMessage(e));
    } finally {
      setIsCompleting(false);
    }
  };

  const isProcessing = order.status === "processing";
  const hasTracking = !!order.tracking_number;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto bg-background/95 backdrop-blur-xl border-l border-white/10"
      >
        <SheetHeader className="space-y-2 text-left">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="font-mono text-primary tracking-wider">
              {shortId(order.id)}
            </SheetTitle>
            <Badge
              variant="outline"
              className="text-[10px] uppercase tracking-wider border-border"
            >
              {STATUS_LABELS[order.status] ?? order.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Sipariş Tarihi:{" "}
            {new Date(order.created_at).toLocaleString("tr-TR")}
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Customer Info */}
          <section className="bg-background/40 backdrop-blur-md border border-white/5 rounded-xl p-4 space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Müşteri Bilgileri
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-semibold text-foreground">{fullName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-foreground/90">{phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-foreground/90 break-all">{email}</span>
              </div>
              <div className="flex items-start gap-2 pt-1">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-foreground/90 leading-relaxed">
                  {street && <div>{street}</div>}
                  {cityLine && (
                    <div className="text-muted-foreground">{cityLine}</div>
                  )}
                  {!street && !cityLine && <span>—</span>}
                </div>
              </div>
            </div>
          </section>

          {/* Packing List */}
          <section className="bg-background/40 backdrop-blur-md border border-white/5 rounded-xl p-4 space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
              <Package className="w-3.5 h-3.5" /> Hazırlanacak Ürünler
            </h3>
            <div className="space-y-2">
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Bu siparişte ürün bulunmuyor.
                </p>
              )}
              {items.map((it: any, idx: number) => {
                const qty = Number(it.quantity ?? 1);
                const price = Number(it.price ?? 0);
                const subtotal = qty * price;
                const variantLabel = extractVariantLabel(it);
                return (
                  <div
                    key={it.id ?? idx}
                    className="flex items-center gap-3 p-2 rounded-lg bg-background/30 border border-white/5"
                  >
                    <div className="w-12 h-12 rounded-md bg-muted/40 border border-border overflow-hidden flex items-center justify-center shrink-0">
                      {it.image ? (
                        <img
                          src={it.image}
                          alt={it.title ?? "Ürün"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => setProductDetailItem(it)}
                        className="text-left w-full group/title"
                        title="Ürün detayını görüntüle"
                      >
                        <p className="text-sm font-medium text-foreground truncate group-hover/title:text-primary transition-colors underline-offset-4 group-hover/title:underline">
                          {it.title ?? "Ürün"}
                        </p>
                      </button>
                      {variantLabel && (
                        <p className="text-[11px] text-primary/80 mt-0.5 truncate">
                          Varyasyon: {variantLabel}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {qty} × {formatPrice(price)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Totals grid */}
            <div className="border-t border-white/5 pt-3 space-y-1.5">
              {discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-300/90 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    Yapılan İndirim
                  </span>
                  <span className="font-semibold text-emerald-300">
                    −{formatPrice(discount)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-muted-foreground">Toplam</span>
                <span className="text-lg font-bold text-primary">
                  {formatPrice(order.total_price)}
                </span>
              </div>
            </div>
            {order.total_coins_used > 0 && (
              <p className="text-xs text-amber-300/80">
                BioCoin Kullanımı: {order.total_coins_used}
              </p>
            )}
          </section>

          {/* Fulfillment Action OR Read-Only Tracking */}
          {isProcessing ? (
            <section className="bg-background/40 backdrop-blur-md border border-primary/20 rounded-xl p-4 space-y-4">
              <h3 className="text-xs uppercase tracking-wider text-primary font-semibold flex items-center gap-2">
                <Truck className="w-3.5 h-3.5" /> Kargo Bilgilerini Gir
              </h3>
              <div className="space-y-2">
                <Label className="text-xs">Kargo Takip No</Label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Örn: 1234567890"
                  className="bg-background/60"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">
                  Kargo Takip Linki{" "}
                  <span className="text-muted-foreground">(opsiyonel)</span>
                </Label>
                <Input
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-background/60"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      İşleniyor...
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4 mr-2" />
                      Kargoya Verildi Olarak İşaretle
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrint}
                  className="w-full sm:w-auto"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Kargo Fişi Yazdır
                </Button>
              </div>
            </section>
          ) : hasTracking ? (
            <section className="bg-background/40 backdrop-blur-md border border-white/5 rounded-xl p-4 space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                <Truck className="w-3.5 h-3.5" /> Kargo Bilgileri
              </h3>
              <div className="text-sm">
                <span className="text-muted-foreground">Takip No: </span>
                <span className="font-mono font-semibold text-foreground">
                  {order.tracking_number}
                </span>
              </div>
              {order.tracking_url && (
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  Kargoyu Takip Et <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handlePrint}
                className="w-full"
              >
                <Printer className="w-4 h-4 mr-2" />
                Kargo Fişi Yazdır
              </Button>
              {order.status === "shipped" && (
                <Button
                  type="button"
                  onClick={handleMarkDelivered}
                  disabled={isCompleting}
                  className="w-full"
                >
                  {isCompleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      İşleniyor...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Teslim Edildi Olarak İşaretle
                    </>
                  )}
                </Button>
              )}
            </section>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              className="w-full"
            >
              <Printer className="w-4 h-4 mr-2" />
              Kargo Fişi Yazdır
            </Button>
          )}
        </div>

        {/* Hidden print-only view */}
        <PackingSlipPrintView order={order} coachName={coachName} />
      </SheetContent>
    </Sheet>
  );
}

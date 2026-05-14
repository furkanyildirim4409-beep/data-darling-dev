import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Calendar, MapPin, User } from "lucide-react";
import OrderFulfillmentSheet from "./OrderFulfillmentSheet";

interface OrderItem {
  id: string;
  user_id: string | null;
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
  orders: OrderItem[];
  isLoading?: boolean;
}

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const formatPrice = (n: number) =>
  `₺${Number(n ?? 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const shortId = (id: string) =>
  `#ORD-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<
    string,
    { label: string; className: string }
  > = {
    processing: {
      label: "Yeni Sipariş - Hazırlanıyor",
      className:
        "bg-blue-500/15 text-blue-300 border border-blue-400/40 shadow-[0_0_18px_-4px_rgba(59,130,246,0.55)]",
    },
    shipped: {
      label: "Kargolandı",
      className:
        "bg-purple-500/15 text-purple-300 border border-purple-400/40 shadow-[0_0_18px_-4px_rgba(168,85,247,0.55)]",
    },
    completed: {
      label: "Teslim Edildi",
      className:
        "bg-emerald-500/15 text-emerald-300 border border-emerald-400/40 shadow-[0_0_18px_-4px_rgba(16,185,129,0.55)]",
    },
    cancelled: {
      label: "İptal Edildi",
      className:
        "bg-destructive/15 text-destructive border border-destructive/40",
    },
    refunded: {
      label: "İade Edildi",
      className:
        "bg-amber-500/15 text-amber-300 border border-amber-400/40",
    },
  };

  const meta = map[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border border-border",
  };

  return (
    <Badge
      variant="outline"
      className={`${meta.className} font-medium px-3 py-1 rounded-full text-[11px] uppercase tracking-wider`}
    >
      {meta.label}
    </Badge>
  );
};

export default function StoreOrdersList({ orders, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="glass rounded-xl border border-border p-4 flex items-center gap-4"
          >
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="glass rounded-xl border border-border p-12 flex flex-col items-center justify-center text-center text-muted-foreground">
        <div className="w-14 h-14 rounded-2xl bg-muted/40 border border-border flex items-center justify-center mb-4">
          <Package className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Henüz sipariş bulunmuyor
        </h3>
        <p className="text-sm">
          Yeni siparişler geldiğinde burada görünecek.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const addr = order.shipping_address ?? {};
        const fullName =
          [addr.firstName, addr.lastName].filter(Boolean).join(" ") ||
          "Bilinmeyen Müşteri";
        const location =
          [addr.city, addr.province].filter(Boolean).join(" / ") || "—";

        return (
          <div
            key={order.id}
            className="bg-background/40 backdrop-blur-md border border-white/5 rounded-xl p-5 grid grid-cols-1 md:grid-cols-[1.2fr_1.4fr_1fr] gap-4 md:items-center hover:border-primary/30 hover:bg-background/60 transition-all duration-200 group"
          >
            {/* Left: Order ID + Date */}
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-sm font-bold text-primary tracking-wider">
                {shortId(order.id)}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(order.created_at)}</span>
              </div>
            </div>

            {/* Mid: Customer */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{fullName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span>{location}</span>
              </div>
            </div>

            {/* Right: Total + Status */}
            <div className="flex md:flex-col md:items-end items-center justify-between gap-2">
              <span className="text-lg font-bold text-foreground tracking-tight">
                {formatPrice(order.total_price)}
              </span>
              <StatusBadge status={order.status} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

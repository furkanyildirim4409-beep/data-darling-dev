import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Lock, ShieldCheck, ShieldAlert, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SmartContractProps {
  athleteId: string;
  missedWorkouts: number;
  totalWorkouts: number;
}

interface ContractState {
  expiryTarget: string | null;
  packageTitle: string | null;
}

export function SmartContract({ athleteId, missedWorkouts, totalWorkouts }: SmartContractProps) {
  const [state, setState] = useState<ContractState>({ expiryTarget: null, packageTitle: null });

  useEffect(() => {
    if (!athleteId) return;
    let cancelled = false;

    const load = async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("id, items, created_at, expires_at, status, order_type")
        .eq("user_id", athleteId)
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(5);

      if (cancelled) return;

      const coachingOrder = (orders ?? []).find((o: any) => {
        if (o.order_type === "coaching") return true;
        const items = Array.isArray(o.items) ? o.items : [];
        return items.some(
          (it: any) => it?.type === "coaching" || it?.item_type === "coaching"
        );
      }) as any;

      if (!coachingOrder) {
        setState({ expiryTarget: null, packageTitle: null });
        return;
      }

      let expiry: string | null = coachingOrder.expires_at ?? null;
      let title: string | null = null;
      const items = Array.isArray(coachingOrder.items) ? coachingOrder.items : [];
      const coachItem = items.find(
        (it: any) => it?.type === "coaching" || it?.item_type === "coaching"
      );
      if (coachItem) {
        title = coachItem.title ?? coachItem.name ?? null;
      }

      if (!expiry && coachItem?.package_id) {
        const { data: pkg } = await supabase
          .from("coaching_packages")
          .select("title, duration_months")
          .eq("id", coachItem.package_id)
          .maybeSingle();
        if (pkg) {
          title = title ?? pkg.title;
          if (pkg.duration_months) {
            const start = new Date(coachingOrder.created_at);
            start.setMonth(start.getMonth() + pkg.duration_months);
            expiry = start.toISOString();
          }
        }
      }

      if (cancelled) return;
      setState({ expiryTarget: expiry, packageTitle: title });
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  const daysRemaining = state.expiryTarget
    ? Math.max(
        0,
        Math.ceil((new Date(state.expiryTarget).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      )
    : null;

  const hasPackage = daysRemaining !== null;
  const isCritical = hasPackage && daysRemaining <= 7;
  const isExpired = hasPackage && daysRemaining === 0;

  const Icon = !hasPackage ? Lock : isCritical ? ShieldAlert : ShieldCheck;
  const accentClass = !hasPackage
    ? "text-muted-foreground"
    : isCritical
    ? "text-destructive"
    : "text-success";
  const borderClass = !hasPackage
    ? "border-border"
    : isCritical
    ? "border-destructive/30"
    : "border-success/30";

  return (
    <div className={cn("glass rounded-xl border p-4 flex items-center gap-4 min-w-[220px]", borderClass)}>
      <div
        className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
          !hasPackage
            ? "bg-muted/30"
            : isCritical
            ? "bg-destructive/20 animate-pulse"
            : "bg-success/20"
        )}
      >
        <Icon className={cn("w-6 h-6", accentClass)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Akıllı Sözleşme</p>
        {hasPackage ? (
          <div
            className={cn(
              "inline-flex items-center gap-1.5 mt-0.5 px-2 py-0.5 rounded-md border text-sm font-bold font-mono tracking-wide",
              isCritical
                ? "border-destructive/40 bg-destructive/10 text-destructive pulse-red"
                : "border-primary/40 bg-primary/10 text-primary"
            )}
            title={state.packageTitle ?? undefined}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            {isExpired ? "SÜRESİ DOLDU" : `${daysRemaining} GÜN KALDI`}
          </div>
        ) : (
          <p className="text-sm font-semibold text-muted-foreground mt-0.5">Aktif Paket Yok</p>
        )}
        <p className="text-xs text-muted-foreground font-mono mt-1 truncate max-w-[200px]">
          Bu ay {missedWorkouts}/{totalWorkouts} kaçırıldı
        </p>
      </div>
    </div>
  );
}

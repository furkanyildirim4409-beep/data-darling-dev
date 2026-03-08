import { useMemo } from "react";
import { CheckCircle, Clock, AlertTriangle, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Payment } from "@/hooks/usePayments";

interface AthletePaymentStatusProps {
  payments: Payment[];
  athletes: { id: string; full_name: string | null }[];
}

interface AthleteStatus {
  id: string;
  name: string;
  status: "paid" | "pending" | "overdue" | "none";
  totalPaid: number;
  totalPending: number;
  lastPaymentDate: string | null;
}

const statusConfig = {
  paid: { label: "Ödendi", icon: CheckCircle, color: "text-success", bg: "bg-success/10", border: "border-success/20" },
  pending: { label: "Bekliyor", icon: Clock, color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
  overdue: { label: "Gecikmiş", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
  none: { label: "Kayıt Yok", icon: User, color: "text-muted-foreground", bg: "bg-muted/50", border: "border-border" },
};

export function AthletePaymentStatus({ payments, athletes }: AthletePaymentStatusProps) {
  const athleteStatuses = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return athletes.map((athlete): AthleteStatus => {
      const athletePayments = payments.filter((p) => p.athlete_id === athlete.id);
      const monthPayments = athletePayments.filter((p) => {
        const d = new Date(p.payment_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      const totalPaid = monthPayments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
      const totalPending = monthPayments.filter((p) => p.status === "pending" || p.status === "overdue").reduce((s, p) => s + Number(p.amount), 0);

      let status: AthleteStatus["status"] = "none";
      if (monthPayments.some((p) => p.status === "overdue")) status = "overdue";
      else if (monthPayments.some((p) => p.status === "pending")) status = "pending";
      else if (monthPayments.some((p) => p.status === "paid")) status = "paid";

      const lastPaymentDate = athletePayments.length > 0
        ? athletePayments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0].payment_date
        : null;

      return { id: athlete.id, name: athlete.full_name || "İsimsiz", status, totalPaid, totalPending, lastPaymentDate };
    });
  }, [payments, athletes]);

  const counts = useMemo(() => {
    const c = { paid: 0, pending: 0, overdue: 0, none: 0 };
    athleteStatuses.forEach((a) => c[a.status]++);
    return c;
  }, [athleteStatuses]);

  const total = athletes.length || 1;
  const monthName = new Date().toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

  return (
    <div className="glass rounded-xl border border-border">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Aylık Ödeme Durumu</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{monthName} • {athletes.length} sporcu</p>
      </div>

      {/* Summary bars */}
      <div className="p-4 space-y-3">
        {(["paid", "pending", "overdue"] as const).map((key) => {
          const cfg = statusConfig[key];
          const Icon = cfg.icon;
          const pct = Math.round((counts[key] / total) * 100);
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                  <span className="text-muted-foreground">{cfg.label}</span>
                </div>
                <span className="font-mono font-medium text-foreground">{counts[key]}<span className="text-muted-foreground text-xs ml-1">(%{pct})</span></span>
              </div>
              <Progress value={pct} className="h-1.5 bg-secondary" />
            </div>
          );
        })}
      </div>

      {/* Athlete list */}
      <div className="border-t border-border divide-y divide-border max-h-[300px] overflow-y-auto">
        {athleteStatuses.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">Sporcu bulunamadı</div>
        ) : (
          athleteStatuses.map((a) => {
            const cfg = statusConfig[a.status];
            const Icon = cfg.icon;
            return (
              <div key={a.id} className="px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", cfg.bg)}>
                    <Icon className={cn("w-4 h-4", cfg.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                    {a.lastPaymentDate && (
                      <p className="text-[11px] text-muted-foreground">
                        Son: {new Date(a.lastPaymentDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.totalPaid > 0 && (
                    <span className="text-xs font-mono text-success">₺{a.totalPaid.toLocaleString("tr-TR")}</span>
                  )}
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", cfg.bg, cfg.color, cfg.border)}>
                    {cfg.label}
                  </Badge>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

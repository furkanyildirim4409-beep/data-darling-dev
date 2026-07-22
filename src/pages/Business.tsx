import { useState } from "react";
import { DollarSign, CreditCard, Calendar, Users, Clock, Plus, Trash2 } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer, Legend } from "recharts";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePayments, type Payment } from "@/hooks/usePayments";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessMetrics } from "@/hooks/useBusinessMetrics";
import { useAssignedPayments } from "@/hooks/useAssignedPayments";
import { NewPaymentDialog } from "@/components/business/NewPaymentDialog";
import { SessionSchedulerDialog } from "@/components/business/SessionSchedulerDialog";
import { CoachingPackagesManager } from "@/components/business/CoachingPackagesManager";

const REVENUE_COLORS = {
  coaching: "hsl(var(--success))",
  shopify: "hsl(var(--warning))",
  other: "hsl(var(--info))",
};

const fmtTRY = (n: number) => `₺${Number(n || 0).toLocaleString("tr-TR")}`;

const nextPayoutLabel = () => {
  const now = new Date();
  const d = now.getDate();
  const target = d < 15
    ? new Date(now.getFullYear(), now.getMonth(), 15)
    : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return target.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
};

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useCoachSessions, useDeleteCoachSession } from "@/hooks/useCoachSessions";


const statusLabels: Record<string, string> = {
  paid: "Ödendi",
  pending: "Bekliyor",
  overdue: "Gecikmiş",
};

export default function Business() {
  const {
    payments, athletes, isLoading,
    addPayment, addAssignedPayment, updatePaymentStatus, deletePayment,
  } = usePayments();

  const { canManageFinances } = usePermissions();
  const { activeCoachId } = useAuth();
  const { data: metrics, isLoading: metricsLoading } = useBusinessMetrics(activeCoachId ?? undefined);
  const { data: customInvoices, isLoading: invoicesLoading } = useAssignedPayments(activeCoachId ?? undefined);

  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [schedulerDialogOpen, setSchedulerDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleSessionCreated = (session: Session) => {
    setSessions((prev) => [...prev, session].sort((a, b) => a.time.localeCompare(b.time)));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  };

  // Merge payments + assigned_payments into a single chronological ledger
  type MergedRow = {
    id: string;
    kind: "payment" | "invoice";
    athlete_name: string;
    date: string;
    description: string | null;
    status: string;
    amount: number;
    raw: any;
  };
  const mergedRecords: MergedRow[] = [
    ...payments.map<MergedRow>((p) => ({
      id: `pay-${p.id}`,
      kind: "payment",
      athlete_name: p.athlete_name || "Bilinmeyen",
      date: p.payment_date,
      description: p.description,
      status: p.status,
      amount: Number(p.amount),
      raw: p,
    })),
    ...(customInvoices ?? []).map<MergedRow>((i) => ({
      id: `inv-${i.id}`,
      kind: "invoice",
      athlete_name: i.athlete_name,
      date: i.created_at,
      description: i.title,
      status: i.status,
      amount: Number(i.amount),
      raw: i,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const recordsLoading = isLoading || invoicesLoading;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">İş Yönetimi</h1>
          <p className="text-muted-foreground mt-1">Gelir, ödemeler ve planlama</p>
        </div>
        <div className="flex items-center gap-2">
          {canManageFinances && (
            <Button
              variant="outline"
              className="border-border hover:bg-secondary"
              onClick={() => setSchedulerDialogOpen(true)}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Seans Planla
            </Button>
          )}
          {canManageFinances && (
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 glow-lime"
              onClick={() => setPaymentDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Yeni Ödeme
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {metricsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Gelir"
            value={fmtTRY(metrics?.total_revenue ?? 0)}
            icon={DollarSign}
            variant="success"
          />
          <StatCard
            title="Aktif Sporcular"
            value={String(metrics?.active_athletes ?? 0)}
            icon={Users}
            variant="default"
          />
          <StatCard
            title="Hakediş"
            value={fmtTRY(metrics?.pending_custom_revenue ?? 0)}
            icon={CreditCard}
            variant={(metrics?.pending_custom_revenue ?? 0) > 0 ? "warning" : "default"}
          />
          <StatCard
            title="Sonraki Ödeme Günü"
            value={nextPayoutLabel()}
            icon={Calendar}
            variant="default"
          />
        </div>
      )}


      {/* Revenue Split Donut */}
      <RevenueSplitCard
        loading={metricsLoading}
        coaching={metrics?.coaching_revenue ?? metrics?.total_package_revenue ?? 0}
        shopify={metrics?.shopify_revenue ?? 0}
        other={metrics?.other_revenue ?? metrics?.paid_custom_revenue ?? 0}
        total={metrics?.total_revenue ?? 0}
      />





      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payments List */}
        <div className="lg:col-span-2 space-y-6">
        <div className="glass rounded-xl border border-border">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Ödeme Kayıtları</h2>
            <span className="text-xs font-mono text-muted-foreground">{mergedRecords.length} kayıt</span>
          </div>

          {recordsLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : mergedRecords.length === 0 ? (
            <div className="p-8 text-center">
              <DollarSign className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Henüz ödeme kaydı yok</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                "Yeni Ödeme" butonuyla ilk kaydı oluşturun
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {mergedRecords.map((row) => (
                <div
                  key={row.id}
                  className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">
                        {row.athlete_name}
                      </p>
                      {row.kind === "invoice" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-primary/30 text-primary bg-primary/5 px-1.5 py-0"
                        >
                          Özel Fatura
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(row.date)}
                      {row.description && ` • ${row.description}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {row.kind === "payment" && canManageFinances ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs border cursor-pointer hover:opacity-80",
                              row.status === "paid" && "bg-success/10 text-success border-success/20",
                              row.status === "pending" && "bg-warning/10 text-warning border-warning/20",
                              row.status === "overdue" && "bg-destructive/10 text-destructive border-destructive/20"
                            )}
                          >
                            {statusLabels[row.status] || row.status}
                          </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-card border-border">
                          <DropdownMenuItem onClick={() => updatePaymentStatus(row.raw.id, "paid")}>
                            <span className="w-2 h-2 rounded-full bg-success mr-2" />
                            Ödendi
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updatePaymentStatus(row.raw.id, "pending")}>
                            <span className="w-2 h-2 rounded-full bg-warning mr-2" />
                            Bekliyor
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updatePaymentStatus(row.raw.id, "overdue")}>
                            <span className="w-2 h-2 rounded-full bg-destructive mr-2" />
                            Gecikmiş
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs border",
                          row.status === "paid" && "bg-success/10 text-success border-success/20",
                          row.status === "pending" && "bg-warning/10 text-warning border-warning/20",
                          row.status === "overdue" && "bg-destructive/10 text-destructive border-destructive/20"
                        )}
                      >
                        {statusLabels[row.status] || row.status}
                      </Badge>
                    )}

                    <span className="font-mono font-semibold text-foreground whitespace-nowrap">
                      ₺{Number(row.amount).toLocaleString("tr-TR")}
                    </span>

                    {row.kind === "payment" && canManageFinances && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(row.raw.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        </div>

        {/* Today's Schedule */}
        <div className="glass rounded-xl border border-border">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Bugünün Programı</h2>
            <span className="text-sm font-mono text-muted-foreground">{sessions.length} seans</span>
          </div>
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
            {sessions.map((session, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{session.athlete}</p>
                    <p className="text-sm text-muted-foreground">{session.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-foreground">{session.time}</p>
                  <p className="text-sm text-muted-foreground">{session.duration}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coaching Packages Manager */}
      <CoachingPackagesManager />

      {/* Dialogs */}
      <NewPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        athletes={athletes}
        onSubmit={addAssignedPayment}
      />

      <SessionSchedulerDialog
        open={schedulerDialogOpen}
        onOpenChange={setSchedulerDialogOpen}
        onSessionCreated={handleSessionCreated}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Ödemeyi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu ödeme kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deletePayment(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface RevenueSplitCardProps {
  loading: boolean;
  coaching: number;
  shopify: number;
  other: number;
  total: number;
}

function RevenueSplitCard({ loading, coaching, shopify, other, total }: RevenueSplitCardProps) {
  const data = [
    { name: "Koçluk Paketleri", value: Number(coaching) || 0, color: REVENUE_COLORS.coaching },
    { name: "E-Ticaret", value: Number(shopify) || 0, color: REVENUE_COLORS.shopify },
    { name: "Diğer Ödemeler", value: Number(other) || 0, color: REVENUE_COLORS.other },
  ];
  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="glass rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-foreground">Gelir Dağılımı</h2>
          <p className="text-xs text-muted-foreground">Koçluk paketleri, e-ticaret ve diğer ödemeler</p>
        </div>
        <span className="text-xs font-mono text-muted-foreground">{fmtTRY(total)}</span>
      </div>

      {loading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : !hasData ? (
        <div className="h-64 flex flex-col items-center justify-center text-center">
          <DollarSign className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Henüz gelir kaydı yok</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Koçluk paketi satışları ve e-ticaret siparişleri burada görünecek
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="recharts-no-focus relative h-64" onMouseDown={(event) => event.preventDefault()}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart accessibilityLayer={false} className="focus:outline-none">
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  minAngle={6}
                  dataKey="value"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                  activeShape={false}
                  rootTabIndex={-1}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} tabIndex={-1} focusable="false" />
                  ))}
                </Pie>
                <RTooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="glass border border-border rounded-lg px-3 py-2 shadow-lg">
                        <p className="text-xs text-muted-foreground">{payload[0].name}</p>
                        <p
                          className="font-mono font-semibold"
                          style={{ color: (payload[0].payload as any).color }}
                        >
                          {fmtTRY(Number(payload[0].value))}
                        </p>
                      </div>
                    ) : null
                  }
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  formatter={(value: string) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -mt-6">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Toplam</span>
              <span className="text-lg font-bold font-mono text-foreground">{fmtTRY(total)}</span>
            </div>
          </div>

          <div className="space-y-3">
            {data.map((d) => {
              const pct = total > 0 ? (d.value / total) * 100 : 0;
              const isEmpty = d.value === 0;
              return (
                <div key={d.name} className={cn("space-y-1", isEmpty && "opacity-60")}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="text-foreground">{d.name}</span>
                    </div>
                    <span className="font-mono font-medium text-foreground">{fmtTRY(d.value)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: d.color }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono text-right">
                    %{pct.toFixed(1)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

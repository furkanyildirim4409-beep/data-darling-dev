import { useState } from "react";
import { DollarSign, CreditCard, Calendar, Users, Clock, Plus, Trash2, RefreshCw } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePayments, type Payment } from "@/hooks/usePayments";
import { usePermissions } from "@/hooks/usePermissions";
import { NewPaymentDialog } from "@/components/business/NewPaymentDialog";
import { SessionSchedulerDialog } from "@/components/business/SessionSchedulerDialog";
import { AthletePaymentStatus } from "@/components/business/AthletePaymentStatus";
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

interface Session {
  athlete: string;
  type: string;
  time: string;
  duration: string;
}

const initialSessions: Session[] = [
  { athlete: "Grup Antrenmanı", type: "Sınıf", time: "11:00", duration: "90 dk" },
];

const statusLabels: Record<string, string> = {
  paid: "Ödendi",
  pending: "Bekliyor",
  overdue: "Gecikmiş",
};

export default function Business() {
  const {
    payments, athletes, isLoading,
    addPayment, updatePaymentStatus, deletePayment,
    totalPaid, totalPending,
  } = usePayments();

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">İş Yönetimi</h1>
          <p className="text-muted-foreground mt-1">Gelir, ödemeler ve planlama</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-border hover:bg-secondary"
            onClick={() => setSchedulerDialogOpen(true)}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Seans Planla
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 glow-lime"
            onClick={() => setPaymentDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Ödeme
          </Button>
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Toplam Gelir"
            value={`₺${totalPaid.toLocaleString("tr-TR")}`}
            icon={DollarSign}
            variant="success"
          />
          <StatCard
            title="Bekleyen"
            value={`₺${totalPending.toLocaleString("tr-TR")}`}
            icon={CreditCard}
            variant={totalPending > 0 ? "warning" : "default"}
          />
          <StatCard
            title="Toplam Ödeme"
            value={String(payments.length)}
            icon={Calendar}
            variant="default"
          />
          <StatCard
            title="Aktif Sporcular"
            value={String(athletes.length)}
            icon={Users}
            variant="default"
          />
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payments List */}
        <div className="lg:col-span-2 space-y-6">
        <div className="glass rounded-xl border border-border">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Ödeme Kayıtları</h2>
            <span className="text-xs font-mono text-muted-foreground">{payments.length} kayıt</span>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center">
              <DollarSign className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Henüz ödeme kaydı yok</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                "Yeni Ödeme" butonuyla ilk kaydı oluşturun
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {payment.athlete_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(payment.payment_date)}
                      {payment.description && ` • ${payment.description}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs border cursor-pointer hover:opacity-80",
                            payment.status === "paid" && "bg-success/10 text-success border-success/20",
                            payment.status === "pending" && "bg-warning/10 text-warning border-warning/20",
                            payment.status === "overdue" && "bg-destructive/10 text-destructive border-destructive/20"
                          )}
                        >
                          {statusLabels[payment.status] || payment.status}
                        </Badge>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-card border-border">
                        <DropdownMenuItem onClick={() => updatePaymentStatus(payment.id, "paid")}>
                          <span className="w-2 h-2 rounded-full bg-success mr-2" />
                          Ödendi
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updatePaymentStatus(payment.id, "pending")}>
                          <span className="w-2 h-2 rounded-full bg-warning mr-2" />
                          Bekliyor
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updatePaymentStatus(payment.id, "overdue")}>
                          <span className="w-2 h-2 rounded-full bg-destructive mr-2" />
                          Gecikmiş
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <span className="font-mono font-semibold text-foreground whitespace-nowrap">
                      ₺{Number(payment.amount).toLocaleString("tr-TR")}
                    </span>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(payment.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Athlete Payment Status Widget */}
        <AthletePaymentStatus payments={payments} athletes={athletes} />
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

      {/* Dialogs */}
      <NewPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        athletes={athletes}
        onSubmit={addPayment}
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

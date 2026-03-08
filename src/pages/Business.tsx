import { useState } from "react";
import { DollarSign, CreditCard, Calendar, TrendingUp, Clock, Users } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NewInvoiceDialog } from "@/components/business/NewInvoiceDialog";
import { SessionSchedulerDialog } from "@/components/business/SessionSchedulerDialog";
import { InvoiceDetailDialog, InvoiceData } from "@/components/business/InvoiceDetailDialog";

const initialInvoices: InvoiceData[] = [
  { id: "INV-001", clientId: "ahmet-yilmaz", clientName: "Ahmet Yılmaz", amount: 2500, status: "paid", date: "15 Oca" },
  { id: "INV-002", clientId: "zeynep-kaya", clientName: "Zeynep Kaya", amount: 2500, status: "paid", date: "14 Oca" },
  { id: "INV-003", clientId: "mehmet-demir", clientName: "Mehmet Demir", amount: 3000, status: "overdue", date: "10 Oca" },
  { id: "INV-004", clientId: "elif-ozturk", clientName: "Elif Öztürk", amount: 4500, status: "pending", date: "20 Oca" },
  { id: "INV-005", clientId: "can-arslan", clientName: "Can Arslan", amount: 2500, status: "paid", date: "12 Oca" },
];

interface Session {
  athlete: string;
  type: string;
  time: string;
  duration: string;
}

const initialSessions: Session[] = [
  { athlete: "Ahmet Yılmaz", type: "Birebir", time: "09:00", duration: "60 dk" },
  { athlete: "Grup Antrenmanı", type: "Sınıf", time: "11:00", duration: "90 dk" },
  { athlete: "Zeynep Kaya", type: "Check-in", time: "14:00", duration: "30 dk" },
  { athlete: "Elif Öztürk", type: "Birebir", time: "16:00", duration: "60 dk" },
];

const statusLabels = {
  paid: "Ödendi",
  pending: "Bekliyor",
  overdue: "Gecikmiş",
};

export default function Business() {
  const [invoices, setInvoices] = useState<InvoiceData[]>(initialInvoices);
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  
  // Dialog states
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [schedulerDialogOpen, setSchedulerDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [invoiceDetailOpen, setInvoiceDetailOpen] = useState(false);

  const handleInvoiceCreated = (invoice: {
    client: string;
    amount: number;
    dueDate: Date;
    serviceType: string;
  }) => {
    const clientId = invoice.client.toLowerCase().replace(/\s+/g, '-');
    const newInvoice: InvoiceData = {
      id: `INV-${String(invoices.length + 1).padStart(3, "0")}`,
      clientId: clientId,
      clientName: invoice.client,
      amount: invoice.amount,
      status: "pending",
      date: new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
      dueDate: invoice.dueDate.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
      serviceType: invoice.serviceType,
    };
    setInvoices((prev) => [newInvoice, ...prev]);
  };

  const handleSessionCreated = (session: Session) => {
    setSessions((prev) => [...prev, session].sort((a, b) => a.time.localeCompare(b.time)));
  };

  const handleInvoiceClick = (invoice: InvoiceData) => {
    setSelectedInvoice(invoice);
    setInvoiceDetailOpen(true);
  };

  // Calculate stats
  const totalRevenue = invoices
    .filter((i) => i.status === "paid")
    .reduce((acc, i) => acc + i.amount, 0);
  const pendingAmount = invoices
    .filter((i) => i.status === "pending" || i.status === "overdue")
    .reduce((acc, i) => acc + i.amount, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">İş Yönetimi</h1>
          <p className="text-muted-foreground mt-1">Gelir, faturalar ve planlama</p>
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
            onClick={() => setInvoiceDialogOpen(true)}
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Yeni Fatura
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Aylık Gelir"
          value={`₺${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          change={{ value: 15, type: "increase" }}
          variant="success"
        />
        <StatCard
          title="Bekleyen"
          value={`₺${pendingAmount.toLocaleString()}`}
          icon={CreditCard}
          variant="warning"
        />
        <StatCard
          title="Bu Hafta Seanslar"
          value={String(sessions.length * 5)}
          icon={Calendar}
          variant="default"
        />
        <StatCard
          title="Aktif Müşteriler"
          value="47"
          icon={Users}
          change={{ value: 8, type: "increase" }}
          variant="default"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="glass rounded-xl border border-border">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Son Faturalar</h2>
            <Button variant="ghost" size="sm" className="text-primary">
              Tümünü Gör
            </Button>
          </div>
          <div className="divide-y divide-border">
            {invoices.slice(0, 5).map((invoice) => (
              <button
                key={invoice.id}
                onClick={() => handleInvoiceClick(invoice)}
                className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors text-left group"
              >
                <div>
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {invoice.clientName}
                  </p>
                  <p className="text-sm text-muted-foreground">{invoice.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs border",
                      invoice.status === "paid" && "bg-success/10 text-success border-success/20",
                      invoice.status === "pending" && "bg-warning/10 text-warning border-warning/20",
                      invoice.status === "overdue" && "bg-destructive/10 text-destructive border-destructive/20"
                    )}
                  >
                    {statusLabels[invoice.status]}
                  </Badge>
                  <span className="font-mono font-semibold text-foreground">
                    ₺{invoice.amount.toLocaleString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="glass rounded-xl border border-border">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Bugünün Programı</h2>
            <span className="text-sm font-mono text-muted-foreground">
              {sessions.length} seans
            </span>
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
      <NewInvoiceDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        onInvoiceCreated={handleInvoiceCreated}
      />

      <SessionSchedulerDialog
        open={schedulerDialogOpen}
        onOpenChange={setSchedulerDialogOpen}
        onSessionCreated={handleSessionCreated}
      />

      <InvoiceDetailDialog
        open={invoiceDetailOpen}
        onOpenChange={setInvoiceDetailOpen}
        invoice={selectedInvoice}
      />
    </div>
  );
}

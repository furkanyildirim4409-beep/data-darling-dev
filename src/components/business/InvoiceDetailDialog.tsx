import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  FileText,
  Check,
  Clock,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { InvoiceAdmin } from "@/types/shared-models";

// Re-export for backward compatibility with existing imports
export type InvoiceData = InvoiceAdmin;

interface InvoiceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceAdmin | null;
}

const statusLabels = {
  paid: "Ödendi",
  pending: "Bekliyor",
  overdue: "Gecikmiş",
};

const statusIcons = {
  paid: Check,
  pending: Clock,
  overdue: CreditCard,
};

export function InvoiceDetailDialog({ open, onOpenChange, invoice }: InvoiceDetailDialogProps) {
  const { toast } = useToast();

  if (!invoice) return null;

  const StatusIcon = statusIcons[invoice.status];
  const displayName = invoice.clientName || invoice.clientId;

  // Mock breakdown data if not provided
  const breakdown = invoice.breakdown || [
    { item: "Personal Training (8 Seans)", quantity: 8, unitPrice: 250, total: 2000 },
    { item: "Beslenme Programı", quantity: 1, unitPrice: 400, total: 400 },
    { item: "Mobil App Erişimi", quantity: 1, unitPrice: 100, total: 100 },
  ];

  // Mock timeline data if not provided
  const timeline = invoice.timeline || [
    { event: "Fatura Oluşturuldu", date: "10 Oca 2026", completed: true },
    { event: "Fatura Gönderildi", date: "10 Oca 2026", completed: true },
    { event: "Müşteri Görüntüledi", date: "11 Oca 2026", completed: invoice.status !== "overdue" },
    { event: "Ödeme Alındı", date: invoice.status === "paid" ? "15 Oca 2026" : "-", completed: invoice.status === "paid" },
  ];

  const handleDownload = () => {
    toast({
      title: "PDF İndiriliyor",
      description: `Fatura #${invoice.id} indiriliyor...`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Fatura Detayı</DialogTitle>
              <DialogDescription>
                Fatura #{invoice.id} • {displayName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status & Summary */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  invoice.status === "paid" && "bg-success/20",
                  invoice.status === "pending" && "bg-warning/20",
                  invoice.status === "overdue" && "bg-destructive/20"
                )}
              >
                <StatusIcon
                  className={cn(
                    "w-5 h-5",
                    invoice.status === "paid" && "text-success",
                    invoice.status === "pending" && "text-warning",
                    invoice.status === "overdue" && "text-destructive"
                  )}
                />
              </div>
              <div>
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
                <p className="text-xs text-muted-foreground mt-1">
                  Oluşturulma: {invoice.date}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">₺{invoice.amount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Toplam Tutar</p>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Maliyet Dökümü</h3>
            <div className="space-y-2">
              {breakdown.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.item}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} x ₺{item.unitPrice.toLocaleString()}
                    </p>
                  </div>
                  <span className="font-mono font-semibold text-foreground">
                    ₺{item.total.toLocaleString()}
                  </span>
                </motion.div>
              ))}
            </div>
            <Separator className="my-3" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Toplam</span>
              <span className="font-mono font-bold text-lg text-foreground">
                ₺{breakdown.reduce((acc, item) => acc + item.total, 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Status Timeline */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Durum Geçmişi</h3>
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-4">
                {timeline.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 + 0.3 }}
                    className="flex items-start gap-4 relative"
                  >
                    {/* Timeline Dot */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center border-2 bg-background z-10",
                        item.completed
                          ? "border-success bg-success/10"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {item.completed ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Clock className="w-4 h-4 text-muted-foreground/50" />
                      )}
                    </div>

                    {/* Timeline Content */}
                    <div className="flex-1 pt-1">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          item.completed ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {item.event}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.date}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Kapat
          </Button>
          <Button
            onClick={handleDownload}
            className="flex-1 bg-primary text-primary-foreground"
          >
            <Download className="w-4 h-4 mr-2" />
            Faturayı İndir (PDF)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useMemo } from "react";
import { Banknote, CalendarClock, Landmark, ArrowDownToLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { Payment } from "@/hooks/usePayments";

const CLEARANCE_DAYS = 14;

const fmtTRY = (n: number) =>
  `₺${Number(n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const fmtDate = (d: Date) =>
  d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });

function nextDisbursementDate(today = new Date()): Date {
  const d = new Date(today);
  const day = d.getDate();
  if (day < 15) {
    d.setDate(15);
  } else {
    d.setMonth(d.getMonth() + 1, 1);
  }
  return d;
}

function maskIban(iban?: string | null): string | null {
  if (!iban) return null;
  const cleaned = iban.replace(/\s+/g, "");
  if (cleaned.length < 4) return null;
  const last2 = cleaned.slice(-2);
  return `TR•• •••• •••• •••• •••• ••${last2}`;
}

interface PayoutDeskProps {
  payments: Payment[];
  payoutIban?: string | null;
}

export function PayoutDesk({ payments, payoutIban }: PayoutDeskProps) {
  const { escrowBalance, payoutRows } = useMemo(() => {
    const now = Date.now();
    const cutoff = now - CLEARANCE_DAYS * 24 * 60 * 60 * 1000;
    const cleared = payments.filter((p) =>
      ["paid", "succeeded"].includes((p.status || "").toLowerCase()),
    );

    const escrow = cleared
      .filter((p) => new Date(p.payment_date).getTime() >= cutoff)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const rows = [...cleared]
      .sort(
        (a, b) =>
          new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime(),
      )
      .map((p) => ({
        id: p.id,
        date: p.payment_date,
        amount: Number(p.amount || 0),
        status:
          new Date(p.payment_date).getTime() < cutoff ? "transferred" : "processing",
      }));

    return { escrowBalance: escrow, payoutRows: rows };
  }, [payments]);

  const next = nextDisbursementDate();
  const maskedIban = maskIban(payoutIban);

  return (
    <div className="glass rounded-xl border border-border">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <ArrowDownToLine className="w-4 h-4 text-primary" />
          Hakediş ve Transfer Takip Masası
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Marketplace tahsilat ve transfer akışı — Dynabolic'ten doğrudan koç hesabına
        </p>
      </div>

      {/* Bento */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Escrow */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
            <Banknote className="w-4 h-4" />
            <span>🏦 Hakediş (Escrow)</span>
          </div>
          <p className="text-2xl font-bold font-mono text-foreground mt-2">
            {fmtTRY(escrowBalance)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Son {CLEARANCE_DAYS} gün içindeki tahsilatlar — clearing cycle'da
          </p>
        </div>

        {/* Next transfer */}
        <div className="rounded-xl border border-border bg-secondary/30 p-4">
          <div className="flex items-center gap-2 text-primary text-xs font-medium">
            <CalendarClock className="w-4 h-4" />
            <span>🗓️ Gelecek Transfer Günü</span>
          </div>
          <p className="text-base font-semibold text-foreground mt-2">
            Her Ayın 1. ve 15. Günü
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 font-mono">
            Sonraki: {fmtDate(next)}
          </p>
        </div>

        {/* IBAN */}
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Landmark className="w-4 h-4" />
            <span>💳 Banka Hesap Bilgisi</span>
          </div>
          {maskedIban ? (
            <>
              <p className="mt-2 font-mono text-sm tracking-wider text-foreground bg-background/60 border border-border rounded-md px-2 py-1.5 inline-block">
                {maskedIban}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Onaylı transfer hesabı
              </p>
            </>
          ) : (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-muted-foreground">
                Henüz IBAN bağlı değil. Hakediş aktarımı için bir hesap ekleyin.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="border-border"
                onClick={() =>
                  toast.info("IBAN bağlama akışı yakında aktif edilecek.")
                }
              >
                <Landmark className="w-3.5 h-3.5 mr-1.5" />
                IBAN Bağla
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Payouts History */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">Transfer Geçmişi</h3>
          <span className="text-xs font-mono text-muted-foreground">
            {payoutRows.length} kayıt
          </span>
        </div>

        {payoutRows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <ArrowDownToLine className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Henüz transfer kaydı yok</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Marketplace tahsilatları clearing cycle'ı tamamladığında burada listelenecek
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                  <TableHead className="text-xs uppercase tracking-wider">Transfer ID</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Dönem / Tarih</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Tutar</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Transfer Durumu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payoutRows.slice(0, 20).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{row.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {fmtDate(new Date(row.date))}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-foreground">
                      {fmtTRY(row.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.status === "transferred" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10">
                          TR GÖNDERİLDİ
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/10">
                          İŞLEMDE
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

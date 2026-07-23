import { useEffect, useState } from "react";
import {
  Banknote,
  Landmark,
  ArrowDownToLine,
  CheckCircle2,
  Clock,
  Wallet,
} from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

const fmtTRY = (n: number) =>
  `₺${Number(n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const fmtDate = (d: Date) =>
  d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });

function maskIban(iban?: string | null): string | null {
  if (!iban) return null;
  const cleaned = iban.replace(/\s+/g, "");
  if (cleaned.length < 4) return null;
  const last2 = cleaned.slice(-2);
  return `TR•• •••• •••• •••• •••• ••${last2}`;
}

type PayoutStatus = "pending" | "approved" | "paid" | "rejected";

interface CoachPayoutRow {
  id: string;
  period_start: string;
  period_end: string;
  gross_lira: number | null;
  commission_percent: number | null;
  commission_lira: number | null;
  net_lira: number | null;
  status: PayoutStatus;
  payment_reference: string | null;
  paid_at: string | null;
}

interface PayoutDeskProps {
  payments?: unknown;
  payoutIban?: string | null;
}

const STATUS_META: Record<
  PayoutStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "BEKLEMEDE",
    className:
      "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/10",
  },
  approved: {
    label: "ONAYLI",
    className:
      "bg-primary/10 text-primary border-primary/20 hover:bg-primary/10",
  },
  paid: {
    label: "ÖDENDİ",
    className:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10",
  },
  rejected: {
    label: "REDDEDİLDİ",
    className:
      "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/10",
  },
};

export function PayoutDesk({ payoutIban }: PayoutDeskProps) {
  const [payouts, setPayouts] = useState<CoachPayoutRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) {
        if (!cancelled) {
          setPayouts([]);
          setLoading(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from("coach_payouts")
        .select(
          "id, period_start, period_end, gross_lira, commission_percent, commission_lira, net_lira, status, payment_reference, paid_at",
        )
        .eq("coach_id", uid)
        .order("period_end", { ascending: false });

      if (cancelled) return;
      if (error) {
        console.error("[PayoutDesk] fetch error", error);
        setPayouts([]);
      } else {
        setPayouts((data ?? []) as CoachPayoutRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sumBy = (s: PayoutStatus) =>
    payouts
      .filter((p) => p.status === s)
      .reduce((acc, p) => acc + Number(p.net_lira || 0), 0);

  const pendingTotal = sumBy("pending");
  const approvedTotal = sumBy("approved");
  const paidTotal = sumBy("paid");

  const maskedIban = maskIban(payoutIban);
  const hasAny = payouts.length > 0;

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

      {/* Summary + IBAN */}
      {hasAny ? (
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Pending */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
              <Clock className="w-4 h-4" />
              <span>Bekleyen</span>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground mt-2">
              {fmtTRY(pendingTotal)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Hesaplandı, onay bekleniyor
            </p>
          </div>

          {/* Approved */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-primary text-xs font-medium">
              <Wallet className="w-4 h-4" />
              <span>Onaylı</span>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground mt-2">
              {fmtTRY(approvedTotal)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Transfer sırasında
            </p>
          </div>

          {/* Paid */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Ödenen</span>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground mt-2">
              {fmtTRY(paidTotal)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Hesabına aktarıldı
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
      ) : (
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Honest empty state */}
          <div className="md:col-span-2 rounded-xl border border-dashed border-border bg-secondary/20 p-6 flex items-start gap-3">
            <Banknote className="w-6 h-6 text-primary/70 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Henüz hakediş kaydın oluşturulmadı.
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Tahsilatların birikiyor; her dönem sonunda hakedişin hesaplanıp burada listelenecek.
              </p>
            </div>
          </div>

          {/* IBAN preserved */}
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
      )}

      {/* Payouts History */}
      {hasAny && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">Hakediş Geçmişi</h3>
            <span className="text-xs font-mono text-muted-foreground">
              {payouts.length} kayıt
            </span>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                  <TableHead className="text-xs uppercase tracking-wider">Dönem</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Net Tutar</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Durum</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Ödeme Bilgisi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((row) => {
                  const meta = STATUS_META[row.status] ?? STATUS_META.pending;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-sm text-foreground">
                        <span className="font-mono">
                          {fmtDate(new Date(row.period_start))} – {fmtDate(new Date(row.period_end))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-foreground">
                        {fmtTRY(Number(row.net_lira || 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={meta.className}>{meta.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {row.status === "paid" && (row.payment_reference || row.paid_at) ? (
                          <div className="flex flex-col items-end">
                            {row.payment_reference && (
                              <span className="font-mono text-foreground">
                                {row.payment_reference}
                              </span>
                            )}
                            {row.paid_at && (
                              <span>{fmtDate(new Date(row.paid_at))}</span>
                            )}
                          </div>
                        ) : (
                          <span>—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {loading && !hasAny && (
        <div className="px-4 pb-4 text-xs text-muted-foreground">Yükleniyor…</div>
      )}
    </div>
  );
}

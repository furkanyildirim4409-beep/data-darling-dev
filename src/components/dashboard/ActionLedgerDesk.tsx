import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ClipboardList, Check, X, Inbox } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface LedgerRow {
  id: string;
  coach_id: string;
  athlete_id: string;
  issue_type: string;
  issue_title: string;
  issue_details: Record<string, unknown> | null;
  status: "pending" | "resolved" | "failed" | "ignored";
  created_at: string;
  updated_at: string;
}

interface AthleteGroup {
  athlete_id: string;
  athlete_name: string;
  rows: LedgerRow[];
}

export function ActionLedgerDesk() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [athleteNames, setAthleteNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("coach_action_ledger" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("[ActionLedgerDesk] fetch", error);
      setIsLoading(false);
      return;
    }

    const list = ((data ?? []) as unknown) as LedgerRow[];
    setRows(list);

    const athleteIds = Array.from(new Set(list.map((r) => r.athlete_id)));
    if (athleteIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", athleteIds);
      const map: Record<string, string> = {};
      (profiles ?? []).forEach((p: { id: string; full_name: string | null }) => {
        map[p.id] = p.full_name ?? "İsimsiz";
      });
      setAthleteNames(map);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`coach_action_ledger_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coach_action_ledger" },
        () => {
          fetchRows();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchRows]);

  const pendingRows = useMemo(
    () => rows.filter((r) => r.status === "pending"),
    [rows]
  );

  const counts = useMemo(() => {
    const c = { pending: 0, resolved: 0, failed: 0 };
    rows.forEach((r) => {
      if (r.status === "pending") c.pending++;
      else if (r.status === "resolved") c.resolved++;
      else if (r.status === "failed") c.failed++;
    });
    return c;
  }, [rows]);

  const groups: AthleteGroup[] = useMemo(() => {
    const map = new Map<string, AthleteGroup>();
    for (const r of pendingRows) {
      const existing = map.get(r.athlete_id);
      if (existing) {
        existing.rows.push(r);
      } else {
        map.set(r.athlete_id, {
          athlete_id: r.athlete_id,
          athlete_name: athleteNames[r.athlete_id] ?? "Sporcu",
          rows: [r],
        });
      }
    }
    return Array.from(map.values());
  }, [pendingRows, athleteNames]);

  const updateStatus = async (
    id: string,
    status: "resolved" | "failed"
  ): Promise<void> => {
    setBusyId(id);
    // Optimistic
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
    const { error } = await supabase
      .from("coach_action_ledger" as never)
      .update({ status })
      .eq("id", id);
    setBusyId(null);
    if (error) {
      toast({
        title: "Hata",
        description: "Durum güncellenemedi.",
        variant: "destructive",
      });
      fetchRows();
      return;
    }
    toast({
      title: status === "resolved" ? "Çözüldü olarak işaretlendi" : "Çözülmedi olarak işaretlendi",
    });
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <Card className="glass border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-foreground">
                Kritik Masası & Takip Defteri
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Listeye alınmış sporcu sorunlarını çöz ve kapat
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
              {counts.pending} bekleyen
            </Badge>
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              {counts.resolved} çözüldü
            </Badge>
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
              {counts.failed} çözülmedi
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Inbox className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">
              Takip listesinde bekleyen bulgu yok
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              AI Doktor Radarı'ndan bulguları "Listeye Ekle" ile buraya alabilirsiniz
            </p>
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            <AnimatePresence initial={false}>
              {groups.map((g) => (
                <motion.div
                  key={g.athlete_id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <AccordionItem
                    value={g.athlete_id}
                    className="border border-border rounded-lg mb-2 px-3 bg-card/50"
                  >
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {getInitials(g.athlete_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {g.athlete_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {g.rows.length} aktif bulgu
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 mr-2">
                          {g.rows.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pb-2">
                        <AnimatePresence initial={false}>
                          {g.rows.map((r) => (
                            <motion.div
                              key={r.id}
                              layout
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, height: 0, marginTop: 0 }}
                              className="rounded-lg border border-border bg-background/60 p-3 flex items-start gap-3"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground leading-snug">
                                  {r.issue_title}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-mono mt-1">
                                  {new Date(r.created_at).toLocaleString("tr-TR")} · {r.issue_type}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  disabled={busyId === r.id}
                                  onClick={() => updateStatus(r.id, "resolved")}
                                  className="h-8 w-8 border-success/40 text-success hover:bg-success/15 hover:text-success"
                                  title="Çözüldü"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  disabled={busyId === r.id}
                                  onClick={() => updateStatus(r.id, "failed")}
                                  className="h-8 w-8 border-destructive/40 text-destructive hover:bg-destructive/15 hover:text-destructive"
                                  title="Çözülmedi"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </AnimatePresence>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

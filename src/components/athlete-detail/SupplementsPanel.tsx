import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Pill, Power, PowerOff, Sparkles, Plus, Trash2 } from "lucide-react";
import { useSupplementMutations } from "@/hooks/useSupplementMutations";
import { AssignSupplementDialog } from "./AssignSupplementDialog";

interface Supplement {
  id: string;
  name_and_dosage: string;
  dosage: string | null;
  timing: string;
  icon: string;
  is_active: boolean;
  servings_left: number;
  total_servings: number;
  created_at: string;
}

interface Props {
  athleteId: string;
}

const TIMING_COLORS: Record<string, string> = {
  "Sabah": "bg-amber-500/10 text-amber-400 border-amber-500/30",
  "Antrenman Öncesi": "bg-blue-500/10 text-blue-400 border-blue-500/30",
  "Antrenman Sonrası": "bg-green-500/10 text-green-400 border-green-500/30",
  "Öğün Arası": "bg-orange-500/10 text-orange-400 border-orange-500/30",
  "Yatmadan Önce": "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
};

export function SupplementsPanel({ athleteId }: Props) {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { deleteSupplement, toggleSupplement } = useSupplementMutations();

  const fetchSupplements = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("assigned_supplements")
      .select("id, name_and_dosage, dosage, timing, icon, is_active, servings_left, total_servings, created_at")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false });
    setSupplements((data as Supplement[]) || []);
    setIsLoading(false);
  }, [athleteId]);

  useEffect(() => {
    fetchSupplements();
  }, [fetchSupplements]);

  const handleToggle = async (sup: Supplement) => {
    setTogglingId(sup.id);
    const success = await toggleSupplement(sup.id, sup.is_active);
    if (success) {
      setSupplements((prev) =>
        prev.map((s) => (s.id === sup.id ? { ...s, is_active: !s.is_active } : s))
      );
    }
    setTogglingId(null);
  };

  const handleDelete = async (id: string) => {
    const success = await deleteSupplement(id);
    if (success) {
      setSupplements((prev) => prev.filter((s) => s.id !== id));
    }
  };

  if (isLoading) {
    return (
      <Card className="glass border-border">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const active = supplements.filter((s) => s.is_active);
  const inactive = supplements.filter((s) => !s.is_active);

  return (
    <>
      <Card className="glass border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Pill className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Takviye Programı
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {active.length} aktif takviye
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white h-8 px-3 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Takviye Ata
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {supplements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Sparkles className="w-8 h-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Henüz takviye atanmamış.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Yukarıdaki butona tıklayarak takviye atayabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...active, ...inactive].map((sup) => {
                const servingsPercent = sup.total_servings > 0
                  ? Math.round((sup.servings_left / sup.total_servings) * 100)
                  : 0;
                const timingClass = TIMING_COLORS[sup.timing] || "bg-muted text-muted-foreground border-border";

                return (
                  <div
                    key={sup.id}
                    className={`rounded-lg border p-3 transition-all ${
                      sup.is_active
                        ? "border-purple-500/20 bg-purple-500/5"
                        : "border-border bg-muted/30 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className="text-lg shrink-0 mt-0.5">{sup.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${sup.is_active ? "text-foreground" : "text-muted-foreground line-through"}`}>
                            {sup.name_and_dosage}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${timingClass}`}
                            >
                              {sup.timing}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {sup.servings_left}/{sup.total_servings} kalan
                            </span>
                          </div>
                          {sup.is_active && (
                            <div className="mt-2">
                              <Progress
                                value={servingsPercent}
                                className="h-1.5 bg-muted/50"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleToggle(sup)}
                          disabled={togglingId === sup.id}
                        >
                          {sup.is_active ? (
                            <PowerOff className="w-3.5 h-3.5 text-muted-foreground" />
                          ) : (
                            <Power className="w-3.5 h-3.5 text-purple-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive/60 hover:text-destructive"
                          onClick={() => handleDelete(sup.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AssignSupplementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        athleteId={athleteId}
        onAssigned={fetchSupplements}
      />
    </>
  );
}

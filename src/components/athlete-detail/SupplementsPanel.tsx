import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Pill, Power, PowerOff, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Supplement {
  id: string;
  name_and_dosage: string;
  is_active: boolean;
  created_at: string;
}

interface Props {
  athleteId: string;
}

export function SupplementsPanel({ athleteId }: Props) {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("assigned_supplements")
        .select("id, name_and_dosage, is_active, created_at")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false });
      setSupplements((data as Supplement[]) || []);
      setIsLoading(false);
    };
    fetch();
  }, [athleteId]);

  const toggleActive = async (sup: Supplement) => {
    setTogglingId(sup.id);
    const { error } = await supabase
      .from("assigned_supplements")
      .update({ is_active: !sup.is_active })
      .eq("id", sup.id);

    if (error) {
      toast({ title: "Hata", description: "Durum güncellenemedi.", variant: "destructive" });
    } else {
      setSupplements((prev) =>
        prev.map((s) => (s.id === sup.id ? { ...s, is_active: !s.is_active } : s))
      );
    }
    setTogglingId(null);
  };

  if (isLoading) {
    return (
      <Card className="glass border-border">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const active = supplements.filter((s) => s.is_active);
  const inactive = supplements.filter((s) => !s.is_active);

  return (
    <Card className="glass border-border">
      <CardHeader className="pb-3">
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
      </CardHeader>
      <CardContent>
        {supplements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Henüz takviye atanmamış.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              AI taraması sonuçlarından takviye aksiyonu uygulayabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...active, ...inactive].map((sup) => (
              <div
                key={sup.id}
                className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-all ${
                  sup.is_active
                    ? "border-purple-500/20 bg-purple-500/5"
                    : "border-border bg-muted/30 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Pill className={`w-4 h-4 shrink-0 ${sup.is_active ? "text-purple-400" : "text-muted-foreground"}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${sup.is_active ? "text-foreground" : "text-muted-foreground line-through"}`}>
                      {sup.name_and_dosage}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(sup.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      sup.is_active
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {sup.is_active ? "Aktif" : "Pasif"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => toggleActive(sup)}
                    disabled={togglingId === sup.id}
                  >
                    {sup.is_active ? (
                      <PowerOff className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <Power className="w-3.5 h-3.5 text-purple-400" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

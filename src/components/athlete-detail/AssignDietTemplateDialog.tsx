import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Apple, Flame, Beef, Wheat, Droplets, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface TemplateWithMacros {
  id: string;
  title: string;
  description: string | null;
  target_calories: number | null;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  foodCount: number;
}

interface AssignDietTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: string;
  onAssigned: () => void;
  activeTemplateId?: string | null;
}

export function AssignDietTemplateDialog({
  open,
  onOpenChange,
  athleteId,
  onAssigned,
  activeTemplateId,
}: AssignDietTemplateDialogProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TemplateWithMacros[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      setLoading(true);
      const { data: tpls } = await supabase
        .from("diet_templates")
        .select("id, title, description, target_calories")
        .eq("coach_id", user.id)
        .order("created_at", { ascending: false });

      if (!tpls?.length) {
        setTemplates([]);
        setLoading(false);
        return;
      }

      const { data: foods } = await supabase
        .from("diet_template_foods")
        .select("template_id, calories, protein, carbs, fat")
        .in("template_id", tpls.map((t) => t.id));

      const mapped: TemplateWithMacros[] = tpls.map((t) => {
        const tf = (foods || []).filter((f) => f.template_id === t.id);
        return {
          ...t,
          totalCalories: tf.reduce((s, f) => s + (f.calories || 0), 0),
          totalProtein: tf.reduce((s, f) => s + (Number(f.protein) || 0), 0),
          totalCarbs: tf.reduce((s, f) => s + (Number(f.carbs) || 0), 0),
          totalFat: tf.reduce((s, f) => s + (Number(f.fat) || 0), 0),
          foodCount: tf.length,
        };
      });
      setTemplates(mapped);
      setLoading(false);
    })();
  }, [open, user]);

  const handleAssign = async (tpl: TemplateWithMacros) => {
    if (!user) return;
    setAssigning(tpl.id);

    // UPSERT into nutrition_targets — single source of truth
    const { error } = await supabase
      .from("nutrition_targets")
      .upsert(
        {
          athlete_id: athleteId,
          coach_id: user.id,
          active_diet_template_id: tpl.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "athlete_id" }
      );

    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Başarılı", description: "Beslenme programı sporcuya atandı!" });
      onAssigned();
      onOpenChange(false);
    }
    setAssigning(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Apple className="w-5 h-5 text-success" />
            Beslenme Programı Ata
          </DialogTitle>
          <DialogDescription>
            Bir diyet şablonu seçerek beslenme programını sporcuya atayın. Tek aktif program olarak ayarlanır.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2 -mr-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <Apple className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Henüz diyet şablonu oluşturmadınız.</p>
            </div>
          ) : (
            <div className="space-y-3 pb-2">
              {templates.map((tpl) => {
                const isActive = activeTemplateId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      isActive
                        ? "border-success/40 bg-success/5 opacity-60"
                        : "border-border hover:border-success/40"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-foreground">{tpl.title}</h4>
                        {tpl.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {tpl.foodCount} besin
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[
                        { icon: Flame, value: tpl.totalCalories, label: "kcal", color: "text-primary" },
                        { icon: Beef, value: Math.round(tpl.totalProtein), label: "g P", color: "text-destructive" },
                        { icon: Wheat, value: Math.round(tpl.totalCarbs), label: "g C", color: "text-warning" },
                        { icon: Droplets, value: Math.round(tpl.totalFat), label: "g F", color: "text-accent-foreground" },
                      ].map((m) => (
                        <div key={m.label} className="text-center p-2 rounded-lg bg-secondary/30">
                          <m.icon className={`w-3.5 h-3.5 mx-auto mb-0.5 ${m.color}`} />
                          <p className={`text-sm font-bold font-mono ${m.color}`}>{m.value}</p>
                          <p className="text-[10px] text-muted-foreground">{m.label}</p>
                        </div>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-success text-success-foreground hover:bg-success/90"
                      disabled={assigning === tpl.id || isActive}
                      onClick={() => handleAssign(tpl)}
                    >
                      {isActive ? (
                        <>
                          <Check className="w-4 h-4 mr-1.5" />
                          Aktif Program
                        </>
                      ) : assigning === tpl.id ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1.5" />
                          Ata
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

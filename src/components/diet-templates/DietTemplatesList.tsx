import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Apple, Plus, Trash2, Loader2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DietTemplateBuilderDialog } from "./DietTemplateBuilderDialog";

interface DietTemplate {
  id: string;
  title: string;
  description: string | null;
  target_calories: number | null;
  created_at: string | null;
  food_count: number;
}

export function DietTemplatesList() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<DietTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("diet_templates")
      .select("id, title, description, target_calories, created_at")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Şablonlar yüklenemedi.");
      setLoading(false);
      return;
    }

    // Fetch food counts per template
    const ids = (data || []).map((t) => t.id);
    let foodCounts: Record<string, number> = {};

    if (ids.length > 0) {
      const { data: foods } = await supabase
        .from("diet_template_foods")
        .select("template_id")
        .in("template_id", ids);

      if (foods) {
        foods.forEach((f) => {
          foodCounts[f.template_id] = (foodCounts[f.template_id] || 0) + 1;
        });
      }
    }

    setTemplates(
      (data || []).map((t) => ({
        ...t,
        food_count: foodCounts[t.id] || 0,
      }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" şablonunu silmek istediğinizden emin misiniz?`)) return;

    const { error } = await supabase.from("diet_templates").delete().eq("id", id);
    if (error) {
      toast.error("Silinemedi: " + error.message);
    } else {
      toast.success("Şablon silindi.");
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Beslenme Şablonları</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sporculara atamak için yeniden kullanılabilir diyet programları oluşturun.
          </p>
        </div>
        <Button onClick={() => setBuilderOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Yeni Şablon Oluştur
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Apple className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Henüz şablon yok</p>
            <p className="text-sm text-muted-foreground mt-1">
              İlk diyet şablonunuzu oluşturarak başlayın.
            </p>
            <Button className="mt-4" onClick={() => setBuilderOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Şablon Oluştur
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Card key={t.id} className="group hover:border-success/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-success/10">
                      <UtensilsCrossed className="w-4 h-4 text-success" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{t.title}</h3>
                      {t.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {t.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => handleDelete(t.id, t.title)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30 text-xs">
                    {t.target_calories || 0} kcal
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {t.food_count} besin
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DietTemplateBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        onSaved={fetchTemplates}
      />
    </div>
  );
}

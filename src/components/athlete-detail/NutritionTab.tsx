import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Apple, Edit, Flame, Beef, Wheat, Droplets, Save, X, Loader2, UtensilsCrossed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface NutritionTabProps {
  athleteId: string;
  currentDiet: string;
  calories: number;
  protein: number;
}

interface NutritionTargets {
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const DEFAULT_TARGETS: NutritionTargets = {
  daily_calories: 2000,
  protein_g: 150,
  carbs_g: 250,
  fat_g: 70,
};

export function NutritionTab({ athleteId }: NutritionTabProps) {
  const [targets, setTargets] = useState<NutritionTargets>(DEFAULT_TARGETS);
  const [formValues, setFormValues] = useState<NutritionTargets>(DEFAULT_TARGETS);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  const fetchTargets = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("nutrition_targets")
      .select("daily_calories, protein_g, carbs_g, fat_g")
      .eq("athlete_id", athleteId)
      .maybeSingle();

    if (data) {
      const t: NutritionTargets = {
        daily_calories: data.daily_calories,
        protein_g: data.protein_g,
        carbs_g: data.carbs_g,
        fat_g: data.fat_g,
      };
      setTargets(t);
      setFormValues(t);
      setHasExisting(true);
    } else {
      setHasExisting(false);
    }
    setIsLoading(false);
  }, [athleteId]);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const handleSave = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Hata", description: "Oturum bulunamadı.", variant: "destructive" });
      setIsSaving(false);
      return;
    }

    const { error } = await supabase
      .from("nutrition_targets")
      .upsert(
        {
          athlete_id: athleteId,
          coach_id: user.id,
          daily_calories: formValues.daily_calories,
          protein_g: formValues.protein_g,
          carbs_g: formValues.carbs_g,
          fat_g: formValues.fat_g,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "athlete_id" }
      );

    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      setTargets(formValues);
      setHasExisting(true);
      setIsEditing(false);
      toast({ title: "Başarılı", description: "Beslenme hedefleri kaydedildi." });
    }
    setIsSaving(false);
  };

  const handleCancel = () => {
    setFormValues(targets);
    setIsEditing(false);
  };

  const macroCards = [
    { label: "Kalori", value: targets.daily_calories, unit: "kcal", icon: Flame, color: "primary" },
    { label: "Protein", value: targets.protein_g, unit: "g", icon: Beef, color: "destructive" },
    { label: "Karbonhidrat", value: targets.carbs_g, unit: "g", icon: Wheat, color: "warning" },
    { label: "Yağ", value: targets.fat_g, unit: "g", icon: Droplets, color: "accent" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-xl border border-success/30 p-5">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-success/20 flex items-center justify-center">
              <Apple className="w-7 h-7 text-success" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Beslenme Hedefleri</h3>
              <p className="text-sm text-muted-foreground">
                {hasExisting ? "Günlük makro hedefler atanmış" : "Henüz hedef atanmadı"}
              </p>
            </div>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="bg-success text-success-foreground hover:bg-success/90">
              <Edit className="w-4 h-4 mr-2" />
              {hasExisting ? "Düzenle" : "Hedef Ata"}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving} className="bg-success text-success-foreground hover:bg-success/90">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Kaydet
              </Button>
              <Button variant="outline" onClick={handleCancel} className="border-border">
                <X className="w-4 h-4 mr-2" />İptal
              </Button>
            </div>
          )}
        </div>

        {/* Edit Form */}
        {isEditing && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 p-4 rounded-xl bg-secondary/30 border border-border">
            {[
              { key: "daily_calories" as const, label: "Kalori (kcal)", icon: Flame },
              { key: "protein_g" as const, label: "Protein (g)", icon: Beef },
              { key: "carbs_g" as const, label: "Karbonhidrat (g)", icon: Wheat },
              { key: "fat_g" as const, label: "Yağ (g)", icon: Droplets },
            ].map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <field.icon className="w-3 h-3" />
                  {field.label}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={formValues[field.key]}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: parseInt(e.target.value) || 0 }))}
                  className="bg-background"
                />
              </div>
            ))}
          </div>
        )}

        {/* Macro Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {macroCards.map((card) => {
            const colorMap: Record<string, string> = {
              primary: "bg-primary/10 border-primary/20 text-primary",
              destructive: "bg-destructive/10 border-destructive/20 text-destructive",
              warning: "bg-warning/10 border-warning/20 text-warning",
              accent: "bg-accent/20 border-accent/30 text-accent-foreground",
            };
            const classes = colorMap[card.color] || colorMap.primary;
            return (
              <div key={card.label} className={cn("p-4 rounded-xl border text-center", classes)}>
                <card.icon className="w-5 h-5 mx-auto mb-1" />
                <p className="text-2xl font-bold font-mono">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.unit} {card.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Meal Plan Placeholder */}
      <div className="glass rounded-xl border border-border p-8 text-center">
        <UtensilsCrossed className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
        <h4 className="text-lg font-semibold text-foreground mb-1">Günlük Beslenme Planı</h4>
        <p className="text-sm text-muted-foreground">
          Besin API entegrasyonu ile öğün takibi yakında eklenecek.
        </p>
        <Badge variant="outline" className="mt-3 border-muted-foreground/20 text-muted-foreground">
          Yakında
        </Badge>
      </div>
    </div>
  );
}

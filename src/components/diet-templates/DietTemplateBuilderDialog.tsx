import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Trash2, Apple, Loader2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FoodRow {
  id: string;
  food_name: string;
  serving_size: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealSection {
  type: string;
  label: string;
  foods: FoodRow[];
}

const MEAL_TYPES: { type: string; label: string }[] = [
  { type: "breakfast", label: "Kahvaltı" },
  { type: "lunch", label: "Öğle Yemeği" },
  { type: "dinner", label: "Akşam Yemeği" },
  { type: "snack", label: "Ara Öğün" },
];

const createEmptyFood = (): FoodRow => ({
  id: crypto.randomUUID(),
  food_name: "",
  serving_size: "",
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
});

interface DietTemplateBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function DietTemplateBuilderDialog({
  open,
  onOpenChange,
  onSaved,
}: DietTemplateBuilderDialogProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetCalories, setTargetCalories] = useState(2000);
  const [meals, setMeals] = useState<MealSection[]>(
    MEAL_TYPES.map((m) => ({ type: m.type, label: m.label, foods: [] }))
  );

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTargetCalories(2000);
    setMeals(MEAL_TYPES.map((m) => ({ type: m.type, label: m.label, foods: [] })));
  };

  const addFood = (mealType: string) => {
    setMeals((prev) =>
      prev.map((m) =>
        m.type === mealType ? { ...m, foods: [...m.foods, createEmptyFood()] } : m
      )
    );
  };

  const removeFood = (mealType: string, foodId: string) => {
    setMeals((prev) =>
      prev.map((m) =>
        m.type === mealType
          ? { ...m, foods: m.foods.filter((f) => f.id !== foodId) }
          : m
      )
    );
  };

  const updateFood = (
    mealType: string,
    foodId: string,
    field: keyof FoodRow,
    value: string | number
  ) => {
    setMeals((prev) =>
      prev.map((m) =>
        m.type === mealType
          ? {
              ...m,
              foods: m.foods.map((f) =>
                f.id === foodId ? { ...f, [field]: value } : f
              ),
            }
          : m
      )
    );
  };

  const totalFoods = meals.reduce((s, m) => s + m.foods.length, 0);
  const totalCals = meals.reduce(
    (s, m) => s + m.foods.reduce((a, f) => a + (f.calories || 0), 0),
    0
  );

  const handleSave = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast.error("Şablon başlığı zorunludur.");
      return;
    }
    if (totalFoods === 0) {
      toast.error("En az bir besin ekleyin.");
      return;
    }

    setSaving(true);
    try {
      // 1. Insert template header
      const { data: template, error: tErr } = await supabase
        .from("diet_templates")
        .insert({
          coach_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          target_calories: targetCalories,
        })
        .select("id")
        .single();

      if (tErr || !template) throw tErr;

      // 2. Bulk insert foods
      const foodRows = meals.flatMap((m) =>
        m.foods
          .filter((f) => f.food_name.trim())
          .map((f) => ({
            template_id: template.id,
            meal_type: m.type,
            food_name: f.food_name.trim(),
            serving_size: f.serving_size || null,
            calories: f.calories || 0,
            protein: f.protein || 0,
            carbs: f.carbs || 0,
            fat: f.fat || 0,
          }))
      );

      if (foodRows.length > 0) {
        const { error: fErr } = await supabase
          .from("diet_template_foods")
          .insert(foodRows);
        if (fErr) {
          // Rollback template
          await supabase.from("diet_templates").delete().eq("id", template.id);
          throw fErr;
        }
      }

      toast.success(`"${title}" şablonu kaydedildi!`);
      resetForm();
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Kaydetme hatası: " + (err?.message || "Bilinmeyen hata"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Apple className="w-5 h-5 text-success" />
            Yeni Diyet Şablonu Oluştur
          </DialogTitle>
          <DialogDescription>
            Koçluk kütüphanenize yeni bir beslenme şablonu ekleyin.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-5 pb-2">
            {/* Header Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="dt-title">Şablon Adı *</Label>
                <Input
                  id="dt-title"
                  placeholder="örn. Bulk Diyet 3000 kcal"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="dt-desc">Açıklama</Label>
                <Textarea
                  id="dt-desc"
                  placeholder="Şablon hakkında kısa açıklama..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="dt-cal">Hedef Kalori (kcal)</Label>
                <Input
                  id="dt-cal"
                  type="number"
                  min={500}
                  value={targetCalories}
                  onChange={(e) => setTargetCalories(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30 mb-1">
                  Toplam: {totalCals} kcal / {totalFoods} besin
                </Badge>
              </div>
            </div>

            {/* Meal Sections */}
            <Accordion type="multiple" defaultValue={MEAL_TYPES.map((m) => m.type)}>
              {meals.map((meal) => (
                <AccordionItem key={meal.type} value={meal.type}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <UtensilsCrossed className="w-4 h-4 text-success" />
                      <span className="font-medium">{meal.label}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {meal.foods.length} besin
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {meal.foods.map((food) => (
                        <div
                          key={food.id}
                          className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border border-border bg-muted/30"
                        >
                          <div className="col-span-4">
                            <Label className="text-xs text-muted-foreground">Besin Adı</Label>
                            <Input
                              placeholder="örn. Yulaf ezmesi"
                              value={food.food_name}
                              onChange={(e) =>
                                updateFood(meal.type, food.id, "food_name", e.target.value)
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs text-muted-foreground">Porsiyon</Label>
                            <Input
                              placeholder="100g"
                              value={food.serving_size}
                              onChange={(e) =>
                                updateFood(meal.type, food.id, "serving_size", e.target.value)
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="col-span-1">
                            <Label className="text-xs text-muted-foreground">Kcal</Label>
                            <Input
                              type="number"
                              min={0}
                              value={food.calories || ""}
                              onChange={(e) =>
                                updateFood(meal.type, food.id, "calories", parseInt(e.target.value) || 0)
                              }
                              className="h-8 text-sm text-center"
                            />
                          </div>
                          <div className="col-span-1">
                            <Label className="text-xs text-muted-foreground">P</Label>
                            <Input
                              type="number"
                              min={0}
                              value={food.protein || ""}
                              onChange={(e) =>
                                updateFood(meal.type, food.id, "protein", parseFloat(e.target.value) || 0)
                              }
                              className="h-8 text-sm text-center"
                            />
                          </div>
                          <div className="col-span-1">
                            <Label className="text-xs text-muted-foreground">C</Label>
                            <Input
                              type="number"
                              min={0}
                              value={food.carbs || ""}
                              onChange={(e) =>
                                updateFood(meal.type, food.id, "carbs", parseFloat(e.target.value) || 0)
                              }
                              className="h-8 text-sm text-center"
                            />
                          </div>
                          <div className="col-span-1">
                            <Label className="text-xs text-muted-foreground">F</Label>
                            <Input
                              type="number"
                              min={0}
                              value={food.fat || ""}
                              onChange={(e) =>
                                updateFood(meal.type, food.id, "fat", parseFloat(e.target.value) || 0)
                              }
                              className="h-8 text-sm text-center"
                            />
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeFood(meal.type, food.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addFood(meal.type)}
                        className="w-full border-dashed"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Besin Ekle
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            İptal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

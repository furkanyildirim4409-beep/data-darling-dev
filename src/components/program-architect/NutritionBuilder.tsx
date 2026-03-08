import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Apple, X, GripVertical, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { LibraryItem } from "./ProgramLibrary";

export interface NutritionItem extends LibraryItem {
  amount: number;
  unit: string;
  mealId: string;
}

interface NutritionBuilderProps {
  selectedItems: NutritionItem[];
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, field: keyof NutritionItem, value: number | string) => void;
  onClearAll: () => void;
  activeMealId: string;
  setActiveMealId: (id: string) => void;
}

const mealTemplates = [
  { id: "meal-1", name: "Kahvaltı", time: "08:00" },
  { id: "meal-2", name: "Ara Öğün 1", time: "10:30" },
  { id: "meal-3", name: "Öğle Yemeği", time: "13:00" },
  { id: "meal-4", name: "Ara Öğün 2", time: "16:00" },
  { id: "meal-5", name: "Akşam Yemeği", time: "19:00" },
  { id: "meal-6", name: "Gece Atıştırması", time: "21:30" },
];

export function NutritionBuilder({
  selectedItems,
  onRemoveItem,
  onUpdateItem,
  onClearAll,
  activeMealId,
  setActiveMealId,
}: NutritionBuilderProps) {
  // GERÇEK Makro Hesaplama
  const calculateTotal = (key: "kcal" | "protein" | "carbs" | "fats") => {
    return selectedItems.reduce((acc, item) => {
      const factor = item.unit === "adet" ? item.amount : item.amount / 100;
      return acc + (item[key] || 0) * factor;
    }, 0);
  };

  const totalKcal = calculateTotal("kcal");
  const totalProtein = calculateTotal("protein");
  const totalCarbs = calculateTotal("carbs");
  const totalFats = calculateTotal("fats");

  // Sadece aktif öğüne ait besinleri göster
  const currentMealItems = selectedItems.filter((item) => item.mealId === activeMealId);

  return (
    <div className="glass rounded-xl border border-border h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-foreground">Beslenme Oluşturucu</h2>
          {selectedItems.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-1.5" /> Temizle
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Kütüphaneden besin eklemek için "+" butonuna tıklayın</p>
      </div>

      {/* Meal Tabs */}
      <div className="px-4 py-3 border-b border-border overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {mealTemplates.map((meal) => (
            <Button
              key={meal.id}
              variant={activeMealId === meal.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveMealId(meal.id)}
              className={cn(
                "text-xs shrink-0",
                activeMealId === meal.id && "bg-success text-success-foreground hover:bg-success/90",
              )}
            >
              <Clock className="w-3 h-3 mr-1" /> {meal.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="p-3 border-b bg-success/10 border-success/30 flex items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Apple className="w-5 h-5 text-success" />
          <span className="font-medium text-sm">{mealTemplates.find((m) => m.id === activeMealId)?.name}</span>
        </div>
        <Badge variant="secondary" className="text-xs bg-success/20 text-success">
          {mealTemplates.find((m) => m.id === activeMealId)?.time}
        </Badge>
      </div>

      {/* Global Stats */}
      <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center gap-2 flex-wrap text-xs">
        <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
          {Math.round(totalKcal)} kcal
        </Badge>
        <Badge variant="secondary" className="bg-info/20 text-info border-info/30">
          P: {Math.round(totalProtein)}g
        </Badge>
        <Badge variant="secondary" className="bg-success/20 text-success border-success/30">
          K: {Math.round(totalCarbs)}g
        </Badge>
        <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
          Y: {Math.round(totalFats)}g
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {currentMealItems.length === 0 ? (
            <div className="border-2 border-dashed rounded-xl p-6 text-center text-muted-foreground">
              <Apple className="w-10 h-10 mb-3 opacity-50 mx-auto" />
              <p className="text-sm font-medium">Bu öğün boş</p>
              <p className="text-xs">Sol panelden besin ekleyin</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentMealItems.map((item, index) => (
                <div
                  key={index}
                  className="glass rounded-lg p-4 border border-border group hover:border-success/30 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Apple className="w-4 h-4 text-success" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.kcal} kcal/100g</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveItem(item.id)}
                      className="h-7 w-7 text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Miktar ({item.unit})</label>
                      <Input
                        type="number"
                        min={1}
                        value={item.amount}
                        onChange={(e) => onUpdateItem(item.id, "amount", parseFloat(e.target.value) || 0)}
                        className="h-9 text-center bg-background/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Toplam Kalori</label>
                      <div className="h-9 flex items-center justify-center text-sm font-medium text-warning bg-background/50 rounded-md border border-input">
                        {Math.round((item.kcal || 0) * (item.unit === "adet" ? item.amount : item.amount / 100))} kcal
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

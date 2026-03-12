import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Apple, X, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LibraryItem } from "./ProgramLibrary";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface NutritionItem extends LibraryItem {
  amount: number;
  unit: string;
  mealId: string;
  dayIndex: number;
}

interface NutritionBuilderProps {
  selectedItems: NutritionItem[];
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, field: keyof NutritionItem, value: number | string) => void;
  onClearAll: () => void;
  activeMealId: string;
  setActiveMealId: (id: string) => void;
  activeNutritionDay: number;
  setActiveNutritionDay: (day: number) => void;
}

const dayLabels = [
  { short: "Pzt", full: "Pazartesi" },
  { short: "Sal", full: "Salı" },
  { short: "Çar", full: "Çarşamba" },
  { short: "Per", full: "Perşembe" },
  { short: "Cum", full: "Cuma" },
  { short: "Cmt", full: "Cumartesi" },
  { short: "Paz", full: "Pazar" },
];

const mealSections = [
  { id: "meal-1", name: "Kahvaltı", icon: "🌅", time: "08:00" },
  { id: "meal-3", name: "Öğle Yemeği", icon: "☀️", time: "13:00" },
  { id: "meal-2", name: "Ara Öğün", icon: "🥤", time: "10:30 / 16:00", linkedIds: ["meal-2", "meal-4"] },
  { id: "meal-5", name: "Akşam Yemeği", icon: "🌙", time: "19:00" },
];

function calcFactor(item: NutritionItem) {
  return item.unit === "adet" ? item.amount : item.amount / 100;
}

function calcMacro(item: NutritionItem, key: "kcal" | "protein" | "carbs" | "fats") {
  return Math.round((item[key] || 0) * calcFactor(item));
}

export function NutritionBuilder({
  selectedItems,
  onRemoveItem,
  onUpdateItem,
  onClearAll,
  activeMealId,
  setActiveMealId,
  activeNutritionDay,
  setActiveNutritionDay,
}: NutritionBuilderProps) {
  const [openMeals, setOpenMeals] = useState<Record<string, boolean>>({
    "meal-1": true,
    "meal-3": true,
    "meal-2": true,
    "meal-5": true,
  });

  const toggleMeal = (mealId: string) => {
    setOpenMeals((prev) => ({ ...prev, [mealId]: !prev[mealId] }));
  };

  // Items for the current day
  const dayItems = selectedItems.filter((item) => item.dayIndex === activeNutritionDay);

  // Get items for a specific meal section
  const getMealItems = (section: typeof mealSections[0]) => {
    const ids = section.linkedIds || [section.id];
    return dayItems.filter((item) => ids.includes(item.mealId));
  };

  // Day totals
  const dayTotalKcal = dayItems.reduce((sum, item) => sum + calcMacro(item, "kcal"), 0);
  const dayTotalProtein = dayItems.reduce((sum, item) => sum + calcMacro(item, "protein"), 0);
  const dayTotalCarbs = dayItems.reduce((sum, item) => sum + calcMacro(item, "carbs"), 0);
  const dayTotalFats = dayItems.reduce((sum, item) => sum + calcMacro(item, "fats"), 0);

  // Weekly average
  const daysWithItems = new Set(selectedItems.map((item) => item.dayIndex)).size;
  const weekTotalKcal = selectedItems.reduce((sum, item) => sum + calcMacro(item, "kcal"), 0);
  const weekAvgKcal = daysWithItems > 0 ? Math.round(weekTotalKcal / daysWithItems) : 0;

  // Day item count for badge
  const dayItemCounts = dayLabels.map((_, i) => selectedItems.filter((item) => item.dayIndex === i).length);

  return (
    <div className="glass rounded-xl border border-border h-full flex flex-col">
      {/* Header */}
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

      {/* Day Tabs */}
      <div className="px-3 py-2 border-b border-border overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {dayLabels.map((day, i) => (
            <Button
              key={i}
              variant={activeNutritionDay === i ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveNutritionDay(i)}
              className={cn(
                "text-xs shrink-0 relative px-3",
                activeNutritionDay === i && "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {day.short}
              {dayItemCounts[i] > 0 && (
                <span className={cn(
                  "absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center",
                  activeNutritionDay === i
                    ? "bg-background text-foreground"
                    : "bg-primary text-primary-foreground"
                )}>
                  {dayItemCounts[i]}
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Day Title & Total Counter */}
      <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-semibold text-sm text-foreground">
            {dayLabels[activeNutritionDay].full}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Haftalık Ort: {weekAvgKcal} kcal/gün
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="secondary" className="text-[10px] bg-warning/20 text-warning border-warning/30">
            {dayTotalKcal} kcal
          </Badge>
          <Badge variant="secondary" className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">
            P: {dayTotalProtein}g
          </Badge>
          <Badge variant="secondary" className="text-[10px] bg-success/20 text-success border-success/30">
            C: {dayTotalCarbs}g
          </Badge>
          <Badge variant="secondary" className="text-[10px] bg-purple-500/20 text-purple-400 border-purple-500/30">
            F: {dayTotalFats}g
          </Badge>
        </div>
      </div>

      {/* Meal Sections */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {mealSections.map((section) => {
            const items = getMealItems(section);
            const isOpen = openMeals[section.id] ?? true;
            const sectionKcal = items.reduce((sum, item) => sum + calcMacro(item, "kcal"), 0);

            return (
              <Collapsible key={section.id} open={isOpen} onOpenChange={() => toggleMeal(section.id)}>
                <CollapsibleTrigger
                  className={cn(
                    "w-full flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer",
                    activeMealId === section.id || (section.linkedIds && section.linkedIds.includes(activeMealId))
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-muted/20 hover:border-muted-foreground/30",
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    // Set active meal for adding items
                    setActiveMealId(section.id);
                    toggleMeal(section.id);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{section.icon}</span>
                    <span className="text-sm font-medium text-foreground">{section.name}</span>
                    <span className="text-[10px] text-muted-foreground">({section.time})</span>
                    {items.length > 0 && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-muted">
                        {items.length}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {sectionKcal > 0 && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-warning/15 text-warning">
                        {sectionKcal} kcal
                      </Badge>
                    )}
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="mt-1.5 space-y-1.5 pl-2">
                    {items.length === 0 ? (
                      <div className="border border-dashed border-border/60 rounded-lg p-3 text-center">
                        <p className="text-[11px] text-muted-foreground">
                          Kütüphaneden besin ekleyin
                        </p>
                      </div>
                    ) : (
                      items.map((item) => (
                        <div
                          key={item.id}
                          className="glass rounded-lg p-3 border border-border group hover:border-primary/20 transition-all"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Apple className="w-3.5 h-3.5 text-success shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{item.name}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onRemoveItem(item.id)}
                              className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>

                          {/* Amount input + macros */}
                          <div className="flex items-center gap-2 mb-2">
                            <Input
                              type="number"
                              min={1}
                              value={item.amount}
                              onChange={(e) => onUpdateItem(item.id, "amount", parseFloat(e.target.value) || 0)}
                              className="h-7 w-16 text-xs text-center bg-background/50"
                            />
                            <span className="text-[10px] text-muted-foreground">{item.unit}</span>
                          </div>

                          {/* Macro badges */}
                          <div className="flex items-center gap-1 flex-wrap">
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-warning/20 text-warning border-warning/30">
                              {calcMacro(item, "kcal")} kcal
                            </Badge>
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-blue-500/20 text-blue-400 border-blue-500/30">
                              P: {calcMacro(item, "protein")}g
                            </Badge>
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-success/20 text-success border-success/30">
                              C: {calcMacro(item, "carbs")}g
                            </Badge>
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-purple-500/20 text-purple-400 border-purple-500/30">
                              F: {calcMacro(item, "fats")}g
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

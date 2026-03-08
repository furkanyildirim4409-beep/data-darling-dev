import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Apple, Edit, Flame, Beef, Wheat, Droplets, Clock, Utensils } from "lucide-react";

interface NutritionTabProps {
  athleteId: string;
  currentDiet: string;
  calories: number;
  protein: number;
}

// Mock nutrition plan data
const nutritionPlan = {
  name: "Kütle Kazanım Protokolü",
  phase: "Bulk Fazı",
  macros: {
    calories: 3200,
    protein: 200,
    carbs: 400,
    fat: 85,
  },
  meals: [
    {
      time: "07:00",
      name: "Kahvaltı",
      foods: [
        { name: "Yulaf Ezmesi", amount: "100g", calories: 380, protein: 13 },
        { name: "Yumurta (Bütün)", amount: "4 adet", calories: 280, protein: 24 },
        { name: "Yumurta Akı", amount: "3 adet", calories: 50, protein: 11 },
        { name: "Muz", amount: "1 adet", calories: 105, protein: 1 },
        { name: "Bal", amount: "1 yemek k.", calories: 60, protein: 0 },
      ],
    },
    {
      time: "10:00",
      name: "Ara Öğün 1",
      foods: [
        { name: "Yoğurt (Yunan)", amount: "200g", calories: 130, protein: 20 },
        { name: "Granola", amount: "50g", calories: 220, protein: 5 },
        { name: "Karışık Kuruyemiş", amount: "30g", calories: 180, protein: 5 },
      ],
    },
    {
      time: "13:00",
      name: "Öğle Yemeği",
      foods: [
        { name: "Tavuk Göğsü", amount: "200g", calories: 330, protein: 62 },
        { name: "Pirinç Pilavı", amount: "200g", calories: 260, protein: 5 },
        { name: "Brokoli", amount: "150g", calories: 50, protein: 4 },
        { name: "Zeytinyağı", amount: "1 yemek k.", calories: 120, protein: 0 },
      ],
    },
    {
      time: "16:00",
      name: "Antrenman Öncesi",
      foods: [
        { name: "Pirinç Patlağı", amount: "50g", calories: 190, protein: 4 },
        { name: "Whey Protein", amount: "1 ölçek", calories: 120, protein: 24 },
        { name: "Muz", amount: "1 adet", calories: 105, protein: 1 },
      ],
    },
    {
      time: "18:30",
      name: "Antrenman Sonrası",
      foods: [
        { name: "Whey Protein", amount: "1 ölçek", calories: 120, protein: 24 },
        { name: "Dekstroz", amount: "50g", calories: 190, protein: 0 },
      ],
    },
    {
      time: "19:30",
      name: "Akşam Yemeği",
      foods: [
        { name: "Dana Biftek", amount: "200g", calories: 420, protein: 50 },
        { name: "Tatlı Patates", amount: "250g", calories: 215, protein: 4 },
        { name: "Yeşil Salata", amount: "100g", calories: 20, protein: 1 },
        { name: "Zeytinyağı", amount: "1 yemek k.", calories: 120, protein: 0 },
      ],
    },
    {
      time: "22:00",
      name: "Gece Atıştırması",
      foods: [
        { name: "Kazein Protein", amount: "1 ölçek", calories: 120, protein: 24 },
        { name: "Fıstık Ezmesi", amount: "2 yemek k.", calories: 190, protein: 8 },
      ],
    },
  ],
};

export function NutritionTab({ athleteId, currentDiet, calories, protein }: NutritionTabProps) {
  const navigate = useNavigate();

  const totalCalories = nutritionPlan.meals.reduce(
    (sum, meal) => sum + meal.foods.reduce((s, f) => s + f.calories, 0),
    0
  );
  const totalProtein = nutritionPlan.meals.reduce(
    (sum, meal) => sum + meal.foods.reduce((s, f) => s + f.protein, 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Nutrition Header */}
      <div className="glass rounded-xl border border-success/30 p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-success/20 flex items-center justify-center">
              <Apple className="w-7 h-7 text-success" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">{nutritionPlan.name}</h3>
              <p className="text-sm text-muted-foreground">{nutritionPlan.phase}</p>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  <Utensils className="w-3 h-3 mr-1" />
                  {nutritionPlan.meals.length} Öğün/Gün
                </Badge>
              </div>
            </div>
          </div>
          <Button
            onClick={() => navigate("/programs")}
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            <Edit className="w-4 h-4 mr-2" />
            Düzenle
          </Button>
        </div>

        {/* Macro Summary */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
            <Flame className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold font-mono text-primary">{nutritionPlan.macros.calories}</p>
            <p className="text-xs text-muted-foreground">kcal</p>
          </div>
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
            <Beef className="w-5 h-5 text-destructive mx-auto mb-1" />
            <p className="text-2xl font-bold font-mono text-destructive">{nutritionPlan.macros.protein}g</p>
            <p className="text-xs text-muted-foreground">Protein</p>
          </div>
          <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 text-center">
            <Wheat className="w-5 h-5 text-warning mx-auto mb-1" />
            <p className="text-2xl font-bold font-mono text-warning">{nutritionPlan.macros.carbs}g</p>
            <p className="text-xs text-muted-foreground">Karb</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
            <Droplets className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-2xl font-bold font-mono text-blue-400">{nutritionPlan.macros.fat}g</p>
            <p className="text-xs text-muted-foreground">Yağ</p>
          </div>
        </div>
      </div>

      {/* Daily Meal Plan */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-success" />
          Günlük Beslenme Planı
        </h4>

        <div className="space-y-3">
          {nutritionPlan.meals.map((meal, idx) => {
            const mealCalories = meal.foods.reduce((s, f) => s + f.calories, 0);
            const mealProtein = meal.foods.reduce((s, f) => s + f.protein, 0);

            return (
              <div
                key={idx}
                className="glass rounded-xl border border-border p-4 hover:border-success/30 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <span className="text-sm font-mono font-bold text-success">{meal.time}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{meal.name}</p>
                      <p className="text-xs text-muted-foreground">{meal.foods.length} besin</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-foreground">{mealCalories} kcal</p>
                    <p className="text-xs text-muted-foreground">{mealProtein}g protein</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {meal.foods.map((food, fidx) => (
                    <div
                      key={fidx}
                      className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 text-sm"
                    >
                      <span className="text-foreground truncate">{food.name}</span>
                      <span className="text-xs text-muted-foreground ml-2 shrink-0">{food.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Daily Total */}
        <div className="glass rounded-xl border border-success/30 p-4 bg-success/5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">Günlük Toplam</span>
            <div className="flex items-center gap-4">
              <span className="font-mono text-primary">{totalCalories} kcal</span>
              <span className="font-mono text-destructive">{totalProtein}g protein</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

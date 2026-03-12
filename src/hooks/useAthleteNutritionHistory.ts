import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, differenceInDays } from "date-fns";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ConsumedFood {
  id: string;
  meal_type: string;
  food_name: string;
  serving_size: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged_at: string;
  planned_food_id: string | null;
}

export interface PlannedFood {
  id: string;
  meal_type: string;
  food_name: string;
  serving_size: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  day_number: number;
  template_id: string;
}

export type UnifiedFoodStatus = "consumed" | "missed" | "manual";

export interface UnifiedFoodItem {
  id: string;
  status: UnifiedFoodStatus;
  meal_type: string;
  food_name: string;
  serving_size: string | null;
  plannedCalories: number;
  plannedProtein: number;
  plannedCarbs: number;
  plannedFat: number;
  actualCalories: number;
  actualProtein: number;
  actualCarbs: number;
  actualFat: number;
}

export interface DailyAggregation {
  date: string;
  label: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  plannedCalories: number;
  plannedProtein: number;
  plannedCarbs: number;
  plannedFat: number;
  foods: ConsumedFood[];
  unifiedFoods: UnifiedFoodItem[];
}

export function useAthleteNutritionHistory(athleteId: string, dateRange?: DateRange) {
  const [dailyData, setDailyData] = useState<DailyAggregation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [calorieTarget, setCalorieTarget] = useState<number>(2000);

  const rangeFrom = dateRange?.from;
  const rangeTo = dateRange?.to;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const startDate = startOfDay(rangeFrom || subDays(new Date(), 6));
    const endDate = endOfDay(rangeTo || new Date());

    // Fetch consumed foods & nutrition targets
    const [foodsRes, targetsRes, assignmentsRes] = await Promise.all([
      supabase
        .from("consumed_foods")
        .select("id, meal_type, food_name, serving_size, calories, protein, carbs, fat, logged_at, planned_food_id")
        .eq("athlete_id", athleteId)
        .gte("logged_at", startDate.toISOString())
        .lte("logged_at", endDate.toISOString())
        .order("logged_at", { ascending: true }),
      supabase
        .from("nutrition_targets")
        .select("daily_calories")
        .eq("athlete_id", athleteId)
        .maybeSingle(),
      supabase
        .from("athlete_diet_assignments")
        .select("template_id")
        .eq("athlete_id", athleteId),
    ]);

    if (targetsRes.data?.daily_calories) {
      setCalorieTarget(targetsRes.data.daily_calories);
    }

    const assignedTemplateIds = (assignmentsRes.data || []).map((a) => a.template_id);

    // Fetch template foods from ALL assigned templates
    let templateFoods: PlannedFood[] = [];
    if (assignedTemplateIds.length > 0) {
      const { data: tplFoods } = await supabase
        .from("diet_template_foods")
        .select("id, meal_type, food_name, serving_size, calories, protein, carbs, fat, day_number, template_id")
        .in("template_id", assignedTemplateIds);

      templateFoods = (tplFoods || []).map((f) => ({
        id: f.id,
        meal_type: f.meal_type,
        food_name: f.food_name,
        serving_size: f.serving_size,
        calories: Number(f.calories) || 0,
        protein: Number(f.protein) || 0,
        carbs: Number(f.carbs) || 0,
        fat: Number(f.fat) || 0,
        day_number: f.day_number || 1,
        template_id: f.template_id,
      }));
    }

    const foods: ConsumedFood[] = (foodsRes.data || []).map((f) => ({
      id: f.id,
      meal_type: f.meal_type,
      food_name: f.food_name,
      serving_size: f.serving_size,
      calories: Number(f.calories) || 0,
      protein: Number(f.protein) || 0,
      carbs: Number(f.carbs) || 0,
      fat: Number(f.fat) || 0,
      logged_at: f.logged_at || "",
      planned_food_id: f.planned_food_id || null,
    }));

    // Build daily buckets
    const bucketStart = rangeFrom || subDays(new Date(), 6);
    const bucketEnd = rangeTo || new Date();
    const allDays = eachDayOfInterval({ start: startOfDay(bucketStart), end: startOfDay(bucketEnd) });

    const buckets: DailyAggregation[] = allDays.map((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      const dayFoods = foods.filter(
        (f) => f.logged_at && format(new Date(f.logged_at), "yyyy-MM-dd") === dateStr
      );

      // Compute day_number (1-7 cycling)
      const dayOffset = differenceInDays(startOfDay(d), startOfDay(bucketStart));
      const dayNumber = (dayOffset % 7) + 1;

      // Get planned foods for this day_number from ALL templates
      const plannedForDay = templateFoods.filter((tf) => tf.day_number === dayNumber);

      // Build unified foods list
      const unifiedFoods: UnifiedFoodItem[] = [];
      const matchedPlannedIds = new Set<string>();

      for (const cf of dayFoods) {
        if (cf.planned_food_id) {
          matchedPlannedIds.add(cf.planned_food_id);
          const planned = plannedForDay.find((pf) => pf.id === cf.planned_food_id);
          unifiedFoods.push({
            id: cf.id,
            status: "consumed",
            meal_type: cf.meal_type,
            food_name: cf.food_name,
            serving_size: cf.serving_size,
            plannedCalories: planned?.calories || cf.calories,
            plannedProtein: planned?.protein || cf.protein,
            plannedCarbs: planned?.carbs || cf.carbs,
            plannedFat: planned?.fat || cf.fat,
            actualCalories: cf.calories,
            actualProtein: cf.protein,
            actualCarbs: cf.carbs,
            actualFat: cf.fat,
          });
        } else {
          unifiedFoods.push({
            id: cf.id,
            status: "manual",
            meal_type: cf.meal_type,
            food_name: cf.food_name,
            serving_size: cf.serving_size,
            plannedCalories: 0,
            plannedProtein: 0,
            plannedCarbs: 0,
            plannedFat: 0,
            actualCalories: cf.calories,
            actualProtein: cf.protein,
            actualCarbs: cf.carbs,
            actualFat: cf.fat,
          });
        }
      }

      for (const pf of plannedForDay) {
        if (!matchedPlannedIds.has(pf.id)) {
          unifiedFoods.push({
            id: pf.id,
            status: "missed",
            meal_type: pf.meal_type,
            food_name: pf.food_name,
            serving_size: pf.serving_size,
            plannedCalories: pf.calories,
            plannedProtein: pf.protein,
            plannedCarbs: pf.carbs,
            plannedFat: pf.fat,
            actualCalories: 0,
            actualProtein: 0,
            actualCarbs: 0,
            actualFat: 0,
          });
        }
      }

      const plannedTotals = plannedForDay.reduce(
        (acc, pf) => ({
          cal: acc.cal + pf.calories,
          pro: acc.pro + pf.protein,
          carb: acc.carb + pf.carbs,
          fat: acc.fat + pf.fat,
        }),
        { cal: 0, pro: 0, carb: 0, fat: 0 }
      );

      return {
        date: dateStr,
        label: format(d, "EEE"),
        totalCalories: dayFoods.reduce((s, f) => s + f.calories, 0),
        totalProtein: dayFoods.reduce((s, f) => s + f.protein, 0),
        totalCarbs: dayFoods.reduce((s, f) => s + f.carbs, 0),
        totalFat: dayFoods.reduce((s, f) => s + f.fat, 0),
        plannedCalories: plannedTotals.cal,
        plannedProtein: plannedTotals.pro,
        plannedCarbs: plannedTotals.carb,
        plannedFat: plannedTotals.fat,
        foods: dayFoods,
        unifiedFoods,
      };
    });

    setDailyData(buckets);
    setIsLoading(false);
  }, [athleteId, rangeFrom, rangeTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const averageAdherence = useMemo(() => {
    const daysWithFood = dailyData.filter((d) => d.totalCalories > 0);
    if (!daysWithFood.length) return 0;
    const avgPct =
      daysWithFood.reduce((s, d) => {
        const pct = Math.min((d.totalCalories / calorieTarget) * 100, 100);
        return s + pct;
      }, 0) / daysWithFood.length;
    return Math.round(avgPct);
  }, [dailyData, calorieTarget]);

  const macroAverages = useMemo(() => {
    const daysWithFood = dailyData.filter((d) => d.totalCalories > 0);
    const count = daysWithFood.length || 1;
    return {
      calories: Math.round(daysWithFood.reduce((s, d) => s + d.totalCalories, 0) / count),
      protein: Math.round(daysWithFood.reduce((s, d) => s + d.totalProtein, 0) / count),
      carbs: Math.round(daysWithFood.reduce((s, d) => s + d.totalCarbs, 0) / count),
      fat: Math.round(daysWithFood.reduce((s, d) => s + d.totalFat, 0) / count),
    };
  }, [dailyData]);

  return { dailyData, isLoading, calorieTarget, averageAdherence, macroAverages };
}

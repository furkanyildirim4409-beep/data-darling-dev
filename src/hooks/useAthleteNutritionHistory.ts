import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from "date-fns";

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
}

export interface DailyAggregation {
  date: string; // YYYY-MM-DD
  label: string; // short day label
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  foods: ConsumedFood[];
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

    const [foodsRes, targetsRes] = await Promise.all([
      supabase
        .from("consumed_foods")
        .select("id, meal_type, food_name, serving_size, calories, protein, carbs, fat, logged_at")
        .eq("athlete_id", athleteId)
        .gte("logged_at", startDate.toISOString())
        .lte("logged_at", endDate.toISOString())
        .order("logged_at", { ascending: true }),
      supabase
        .from("nutrition_targets")
        .select("daily_calories")
        .eq("athlete_id", athleteId)
        .maybeSingle(),
    ]);

    if (targetsRes.data?.daily_calories) {
      setCalorieTarget(targetsRes.data.daily_calories);
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
    }));

    // Build daily buckets for the date range
    const bucketStart = rangeFrom || subDays(new Date(), 6);
    const bucketEnd = rangeTo || new Date();
    const allDays = eachDayOfInterval({ start: startOfDay(bucketStart), end: startOfDay(bucketEnd) });
    const buckets: DailyAggregation[] = allDays.map((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      const dayFoods = foods.filter(
        (f) => f.logged_at && format(new Date(f.logged_at), "yyyy-MM-dd") === dateStr
      );
      return {
        date: dateStr,
        label: format(d, "EEE"),
        totalCalories: dayFoods.reduce((s, f) => s + f.calories, 0),
        totalProtein: dayFoods.reduce((s, f) => s + f.protein, 0),
        totalCarbs: dayFoods.reduce((s, f) => s + f.carbs, 0),
        totalFat: dayFoods.reduce((s, f) => s + f.fat, 0),
        foods: dayFoods,
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

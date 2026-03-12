import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell, Apple, Calendar, ChevronDown, ChevronUp, Clock, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ActiveBlocksProps {
  athleteId: string;
}

interface TrainingData {
  programId: string;
  programName: string;
  description: string | null;
  startDate: string | null;
  totalDays: number;
  elapsedDays: number;
}

interface DietData {
  templateId: string | null;
  templateName: string;
  description: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface WorkoutDay {
  dayOfWeek: string;
  workoutName: string;
  exerciseCount: number;
}

interface DietDayFood {
  meal_type: string;
  food_name: string;
  calories: number;
  protein: number;
}

export function ActiveBlocks({ athleteId }: ActiveBlocksProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [training, setTraining] = useState<TrainingData | null>(null);
  const [diet, setDiet] = useState<DietData | null>(null);

  // Expand states
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [dietOpen, setDietOpen] = useState(false);

  // Detail data (fetched on expand)
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([]);
  const [dietFoods, setDietFoods] = useState<DietDayFood[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    const [profileRes, nutritionRes] = await Promise.all([
      supabase.from("profiles").select("active_program_id").eq("id", athleteId).maybeSingle(),
      supabase.from("nutrition_targets").select("active_diet_template_id, daily_calories, protein_g, carbs_g, fat_g").eq("athlete_id", athleteId).maybeSingle(),
    ]);

    const programId = profileRes.data?.active_program_id;
    if (programId) {
      const [programRes, workoutsRes] = await Promise.all([
        supabase.from("programs").select("title, description, created_at").eq("id", programId).maybeSingle(),
        supabase.from("assigned_workouts").select("scheduled_date").eq("athlete_id", athleteId).eq("program_id", programId).order("scheduled_date", { ascending: true }),
      ]);

      if (programRes.data) {
        const dates = (workoutsRes.data || []).map((w) => w.scheduled_date).filter(Boolean).sort();
        const startDate = dates[0] || programRes.data.created_at?.slice(0, 10) || null;
        const endDate = dates[dates.length - 1] || null;
        let totalDays = 56;
        let elapsedDays = 0;
        if (startDate && endDate) {
          totalDays = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
          elapsedDays = Math.max(0, Math.ceil((Date.now() - new Date(startDate).getTime()) / 86400000));
        } else if (startDate) {
          elapsedDays = Math.max(0, Math.ceil((Date.now() - new Date(startDate).getTime()) / 86400000));
        }
        setTraining({
          programId,
          programName: programRes.data.title,
          description: programRes.data.description,
          startDate,
          totalDays,
          elapsedDays: Math.min(elapsedDays, totalDays),
        });
      }
    } else {
      setTraining(null);
    }

    const templateId = nutritionRes.data?.active_diet_template_id;
    if (templateId) {
      const tplRes = await supabase.from("diet_templates").select("title, description").eq("id", templateId).maybeSingle();
      setDiet({
        templateId,
        templateName: tplRes.data?.title || "Beslenme Planı",
        description: tplRes.data?.description || null,
        calories: nutritionRes.data?.daily_calories || 0,
        protein: nutritionRes.data?.protein_g || 0,
        carbs: nutritionRes.data?.carbs_g || 0,
        fat: nutritionRes.data?.fat_g || 0,
      });
    } else if (nutritionRes.data) {
      setDiet({
        templateId: null,
        templateName: "Özel Hedefler",
        description: null,
        calories: nutritionRes.data.daily_calories || 0,
        protein: nutritionRes.data.protein_g || 0,
        carbs: nutritionRes.data.carbs_g || 0,
        fat: nutritionRes.data.fat_g || 0,
      });
    } else {
      setDiet(null);
    }

    setIsLoading(false);
  }, [athleteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTrainingToggle = useCallback(async () => {
    if (!training) return;
    const willOpen = !trainingOpen;
    setTrainingOpen(willOpen);

    if (willOpen && workoutDays.length === 0) {
      setDetailLoading(true);
      const { data } = await supabase
        .from("assigned_workouts")
        .select("day_of_week, workout_name, exercises")
        .eq("athlete_id", athleteId)
        .eq("program_id", training.programId);

      if (data) {
        const dayOrder = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
        const days: WorkoutDay[] = data.map((w: any) => ({
          dayOfWeek: w.day_of_week || "—",
          workoutName: w.workout_name || "Antrenman",
          exerciseCount: Array.isArray(w.exercises) ? w.exercises.length : 0,
        })).sort((a, b) => dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek));
        setWorkoutDays(days);
      }
      setDetailLoading(false);
    }
  }, [training, trainingOpen, workoutDays.length, athleteId]);

  const handleDietToggle = useCallback(async () => {
    if (!diet) return;
    const willOpen = !dietOpen;
    setDietOpen(willOpen);

    if (willOpen && dietFoods.length === 0 && diet.templateId) {
      setDetailLoading(true);
      const { data } = await supabase
        .from("diet_template_foods")
        .select("meal_type, food_name, calories, protein")
        .eq("template_id", diet.templateId)
        .eq("day_number", 1)
        .order("meal_type");

      if (data) {
        setDietFoods(data.map((f: any) => ({
          meal_type: f.meal_type,
          food_name: f.food_name,
          calories: f.calories || 0,
          protein: f.protein || 0,
        })));
      }
      setDetailLoading(false);
    }
  }, [diet, dietOpen, dietFoods.length]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  const currentWeek = training ? Math.max(1, Math.ceil(training.elapsedDays / 7)) : 0;
  const totalWeeks = training ? Math.max(1, Math.ceil(training.totalDays / 7)) : 1;
  const progressPct = training ? Math.min(100, Math.round((training.elapsedDays / training.totalDays) * 100)) : 0;

  const mealLabels: Record<string, string> = {
    breakfast: "Kahvaltı",
    lunch: "Öğle",
    snack: "Ara Öğün",
    dinner: "Akşam",
  };

  return (
    <div className="space-y-4">
      {/* Training Block */}
      <div
        className="glass rounded-xl border border-border p-4 hover:border-primary/30 transition-all cursor-pointer group"
        onClick={handleTrainingToggle}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">
                {training ? training.programName : "Program Yok"}
              </h4>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {training?.description || (training ? "Aktif program" : "Henüz program atanmadı")}
              </p>
            </div>
          </div>
          {training ? (
            trainingOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            )
          ) : null}
        </div>

        {training ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                Hafta {currentWeek}/{totalWeeks}
              </Badge>
              {training.startDate && (
                <Badge variant="outline" className="text-xs text-muted-foreground border-border">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(training.startDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                </Badge>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">İlerleme</span>
                <span className="font-mono text-foreground">%{progressPct}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            {/* Expanded: Workout Days Summary */}
            {trainingOpen && (
              <div className="mt-4 pt-4 border-t border-border space-y-2" onClick={(e) => e.stopPropagation()}>
                <p className="text-xs font-medium text-muted-foreground mb-2">Haftalık Program Özeti</p>
                {detailLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
                  </div>
                ) : workoutDays.length > 0 ? (
                  workoutDays.map((day, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 border border-border/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-primary w-16">{day.dayOfWeek}</span>
                        <span className="text-xs text-foreground">{day.workoutName}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {day.exerciseCount} hareket
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-2">Henüz antrenman günü atanmamış.</p>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Antrenman Programı sekmesinden bir program atayabilirsiniz.
          </p>
        )}
      </div>

      {/* Diet Block */}
      <div
        className="glass rounded-xl border border-border p-4 hover:border-success/30 transition-all cursor-pointer group"
        onClick={handleDietToggle}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <Apple className="w-5 h-5 text-success" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">
                {diet ? diet.templateName : "Beslenme Planı Yok"}
              </h4>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {diet?.description || (diet ? "Aktif beslenme planı" : "Henüz beslenme planı atanmadı")}
              </p>
            </div>
          </div>
          {diet ? (
            dietOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-success transition-colors shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-success transition-colors shrink-0" />
            )
          ) : null}
        </div>

        {diet ? (
          <>
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 rounded-lg bg-secondary/50 text-center">
                <p className="text-sm font-bold font-mono text-foreground">{diet.calories}</p>
                <p className="text-[10px] text-muted-foreground">kcal</p>
              </div>
              <div className="p-2 rounded-lg bg-secondary/50 text-center">
                <p className="text-sm font-bold font-mono text-foreground">{diet.protein}g</p>
                <p className="text-[10px] text-muted-foreground">protein</p>
              </div>
              <div className="p-2 rounded-lg bg-secondary/50 text-center">
                <p className="text-sm font-bold font-mono text-foreground">{diet.carbs}g</p>
                <p className="text-[10px] text-muted-foreground">karb</p>
              </div>
              <div className="p-2 rounded-lg bg-secondary/50 text-center">
                <p className="text-sm font-bold font-mono text-foreground">{diet.fat}g</p>
                <p className="text-[10px] text-muted-foreground">yağ</p>
              </div>
            </div>

            {/* Expanded: Diet Day 1 Summary */}
            {dietOpen && (
              <div className="mt-4 pt-4 border-t border-border space-y-2" onClick={(e) => e.stopPropagation()}>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  <Target className="w-3 h-3 inline mr-1" />
                  Örnek Gün (Pazartesi)
                </p>
                {detailLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
                  </div>
                ) : dietFoods.length > 0 ? (
                  Object.entries(
                    dietFoods.reduce<Record<string, DietDayFood[]>>((acc, f) => {
                      const key = f.meal_type;
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(f);
                      return acc;
                    }, {})
                  ).map(([mealType, foods]) => (
                    <div key={mealType} className="rounded-lg bg-secondary/50 border border-border/50 p-2.5">
                      <p className="text-[10px] font-medium text-success mb-1.5">{mealLabels[mealType] || mealType}</p>
                      {foods.map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-0.5">
                          <span className="text-foreground">{f.food_name}</span>
                          <span className="text-muted-foreground font-mono">{f.calories} kcal</span>
                        </div>
                      ))}
                    </div>
                  ))
                ) : diet.templateId ? (
                  <p className="text-xs text-muted-foreground italic text-center py-2">Şablonda henüz yiyecek eklenmemiş.</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-2">Özel hedefler — şablon detayı yok.</p>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Beslenme Planı sekmesinden bir şablon atayabilirsiniz.
          </p>
        )}
      </div>
    </div>
  );
}

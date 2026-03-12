import { useState, useCallback } from "react";
import { ProgramDashboard, ProgramData } from "@/components/program-architect/ProgramDashboard";
import { ProgramLibrary, LibraryItem, SavedTemplate } from "@/components/program-architect/ProgramLibrary";
import { WorkoutBuilder, BuilderExercise, DayPlan, BlockType, AutomationRule, ExerciseGroup } from "@/components/program-architect/WorkoutBuilder";
import { NutritionBuilder, NutritionItem } from "@/components/program-architect/NutritionBuilder";
import { WeeklySchedule } from "@/components/program-architect/WeeklySchedule";
import { SaveTemplateDialog } from "@/components/program-architect/SaveTemplateDialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dumbbell, Apple, BookMarked, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type ViewMode = "dashboard" | "builder";

const createEmptyWeek = (): DayPlan[] =>
  Array.from({ length: 7 }, (_, i) => ({ day: i + 1, label: "", notes: "", blockType: "none" as BlockType, exercises: [] }));

export default function Programs() {
  const { user } = useAuth();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [builderMode, setBuilderMode] = useState<"exercise" | "nutrition">("exercise");
  const [editingProgram, setEditingProgram] = useState<ProgramData | null>(null);

  // Builder state — 7-day structure
  const [weekPlan, setWeekPlan] = useState<DayPlan[]>(createEmptyWeek());
  const [activeDay, setActiveDay] = useState(0);
  const [selectedNutrition, setSelectedNutrition] = useState<NutritionItem[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [activeMealId, setActiveMealId] = useState("meal-1");
  const [activeNutritionDay, setActiveNutritionDay] = useState(0);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [dayGroups, setDayGroups] = useState<Record<number, ExerciseGroup[]>>({});

  // Force dashboard refresh key
  const [dashboardKey, setDashboardKey] = useState(0);
  const [isAIGenerating, setIsAIGenerating] = useState(false);

  // Flatten all exercises for compatibility
  const allExercises = weekPlan.flatMap((d) => d.exercises);

  const handleCreateProgram = useCallback((type: "exercise" | "nutrition") => {
    setBuilderMode(type);
    setEditingProgram(null);
    setWeekPlan(createEmptyWeek());
    setActiveDay(0);
    setSelectedNutrition([]);
    setAutomationRules([]);
    setDayGroups({});
    setViewMode("builder");
  }, []);

  const handleEditProgram = useCallback(async (program: ProgramData) => {
    setBuilderMode(program.type);
    setEditingProgram(program);
    setViewMode("builder");

    if (program.type === "nutrition") {
      // Load diet_template_foods into selectedNutrition
      const { data: foods, error } = await supabase
        .from("diet_template_foods")
        .select("*")
        .eq("template_id", program.id)
        .order("id");

      if (error) {
        toast.error("Besinler yüklenemedi: " + error.message);
        return;
      }

      const reverseMealMap: Record<string, string> = {
        breakfast: "meal-1",
        snack: "meal-2",
        lunch: "meal-3",
        dinner: "meal-5",
      };

      const nutritionItems: NutritionItem[] = (foods ?? []).map((f) => {
        // Parse serving_size to get amount and unit
        const servingMatch = (f.serving_size || "100g").match(/^(\d+\.?\d*)(.*)/);
        const amount = servingMatch ? parseFloat(servingMatch[1]) : 100;
        const unit = servingMatch && servingMatch[2]?.trim() ? servingMatch[2].trim() : "g";
        const factor = unit === "adet" ? amount : amount / 100;

        return {
          id: f.id,
          name: f.food_name,
          category: "Genel",
          type: "nutrition",
          kcal: factor > 0 ? Math.round((f.calories || 0) / factor) : 0,
          protein: factor > 0 ? Math.round((f.protein || 0) / factor) : 0,
          carbs: factor > 0 ? Math.round((f.carbs || 0) / factor) : 0,
          fats: factor > 0 ? Math.round((f.fat || 0) / factor) : 0,
          amount,
          unit,
          mealId: reverseMealMap[f.meal_type] || "meal-2",
          dayIndex: (f.day_number || 1) - 1,
        };
      });

      setSelectedNutrition(nutritionItems);
      setActiveNutritionDay(0);
      setActiveMealId("meal-1");
      toast.info(`"${program.name}" düzenleme modunda açıldı.`);
      return;
    }

    // Exercise mode
    const { data: exercises, error } = await supabase
      .from("exercises")
      .select("*")
      .eq("program_id", program.id)
      .order("order_index", { ascending: true });

    if (error) {
      toast.error("Egzersizler yüklenemedi: " + error.message);
      return;
    }

    // Load program metadata (rules + week_config)
    const { data: progData } = await supabase
      .from("programs")
      .select("automation_rules, week_config")
      .eq("id", program.id)
      .single();

    const newWeek = createEmptyWeek();

    // First load exercises into newWeek so we have fresh UUIDs
    if (exercises && exercises.length > 0) {
      exercises.forEach((ex) => {
        const dayIndex = Math.floor((ex.order_index ?? 0) / 100);
        const clampedDay = Math.min(Math.max(dayIndex, 0), 6);
        const mapped: BuilderExercise = {
          id: ex.id,
          name: ex.name,
          category: "",
          type: "exercise",
          sets: ex.sets ?? 3,
          reps: parseInt(ex.reps ?? "10", 10),
          rpe: 7,
          rir: (ex as any).rir ?? 2,
          rirPerSet: Array.isArray((ex as any).rir_per_set) ? (ex as any).rir_per_set : undefined,
          failureSet: (ex as any).failure_set ?? false,
          notes: ex.notes ?? undefined,
          videoUrl: (ex as any).video_url || undefined,
        };
        newWeek[clampedDay].exercises.push(mapped);
      });
    }

    // Now restore week_config (labels, blockTypes, groups) AFTER exercises are loaded
    const weekConfig = (progData?.week_config as any[]) || [];
    const loadedGroups: Record<number, ExerciseGroup[]> = {};
    weekConfig.forEach((cfg: any, i: number) => {
      if (i < 7) {
        newWeek[i].label = cfg.label || "";
        newWeek[i].notes = cfg.notes || "";
        newWeek[i].blockType = cfg.blockType || "none";
        
        if (cfg.groups?.length) {
          // Reconstruct exerciseIds from exerciseIndices using fresh DB UUIDs
          loadedGroups[i] = cfg.groups.map((g: any) => {
            const reconstructedIds = g.exerciseIndices && newWeek[i].exercises.length
              ? g.exerciseIndices
                  .map((idx: number) => newWeek[i].exercises[idx]?.id)
                  .filter(Boolean)
              : g.exerciseIds || [];
            
            return { ...g, exerciseIds: reconstructedIds };
          });
        }
      }
    });
    setDayGroups(loadedGroups);
    setAutomationRules((progData?.automation_rules as unknown as AutomationRule[]) || []);

    setWeekPlan(newWeek);
    setActiveDay(0);
    toast.info(`"${program.name}" düzenleme modunda açıldı.`);
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setViewMode("dashboard");
    setEditingProgram(null);
  }, []);

  const handleAddItem = useCallback(
    (item: LibraryItem) => {
      if (builderMode === "exercise") {
        // Check if already in active day
        if (weekPlan[activeDay].exercises.find((ex) => ex.id === item.id)) return;
        const newExercise: BuilderExercise = { ...item, sets: 3, reps: 10, rpe: 7, rir: 2, failureSet: false, videoUrl: item.gifUrl || undefined };
        setWeekPlan((prev) =>
          prev.map((d, i) =>
            i === activeDay ? { ...d, exercises: [...d.exercises, newExercise] } : d
          )
        );
      } else {
        const newNutrition: NutritionItem = {
          ...item,
          id: `${item.id}-${Date.now()}`,
          amount: 100,
          unit: item.name.includes("(Adet)") ? "adet" : "g",
          mealId: activeMealId,
          dayIndex: activeNutritionDay,
        };
        setSelectedNutrition((prev) => [...prev, newNutrition]);
        toast.success(`${item.name} listeye eklendi.`);
      }
    },
    [builderMode, weekPlan, activeDay, activeMealId, activeNutritionDay]
  );

  const handleRemoveExercise = useCallback((dayIndex: number, id: string) => {
    setWeekPlan((prev) =>
      prev.map((d, i) =>
        i === dayIndex ? { ...d, exercises: d.exercises.filter((ex) => ex.id !== id) } : d
      )
    );
  }, []);

  const handleRemoveNutrition = useCallback((id: string) => {
    setSelectedNutrition((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleUpdateExercise = useCallback(
    (dayIndex: number, id: string, field: keyof BuilderExercise, value: number | string | number[]) => {
      setWeekPlan((prev) =>
        prev.map((d, i) =>
          i === dayIndex
            ? { ...d, exercises: d.exercises.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex)) }
            : d
        )
      );
    },
    []
  );

  const handleUpdateNutrition = useCallback(
    (id: string, field: keyof NutritionItem, value: number | string) => {
      setSelectedNutrition((prev) =>
        prev.map((n) => (n.id === id ? { ...n, [field]: value } : n))
      );
    },
    []
  );

  const handleUpdateDayLabel = useCallback((dayIndex: number, label: string) => {
    setWeekPlan((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, label } : d))
    );
  }, []);

  const handleUpdateDayNotes = useCallback((dayIndex: number, notes: string) => {
    setWeekPlan((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, notes } : d))
    );
  }, []);

  const handleUpdateDayBlockType = useCallback((dayIndex: number, blockType: BlockType) => {
    setWeekPlan((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, blockType } : d))
    );
  }, []);

  const handleClearDay = useCallback((dayIndex: number) => {
    setWeekPlan((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, exercises: [], label: "", notes: "", blockType: "none" as BlockType } : d))
    );
  }, []);

  const handleDuplicateDay = useCallback((sourceDayIndex: number, targetDayIndex: number) => {
    // Pre-compute ID mapping so exercises and groups stay in sync
    const sourceExercises = weekPlan[sourceDayIndex].exercises;
    const idMap = new Map<string, string>();
    sourceExercises.forEach((ex) => {
      idMap.set(ex.id, `${ex.id}-cp-${Math.random().toString(36).slice(2, 8)}`);
    });

    setWeekPlan((prev) => {
      const sourceDay = prev[sourceDayIndex];
      const clonedExercises = sourceDay.exercises.map((ex) => ({
        ...ex,
        id: idMap.get(ex.id) || ex.id,
      }));
      return prev.map((d, i) =>
        i === targetDayIndex
          ? { ...d, exercises: clonedExercises, label: sourceDay.label, notes: sourceDay.notes, blockType: sourceDay.blockType }
          : d
      );
    });

    setDayGroups((prev) => {
      const sourceGroups = prev[sourceDayIndex] || [];
      if (sourceGroups.length === 0) {
        const { [targetDayIndex]: _, ...rest } = prev;
        return rest;
      }
      const clonedGroups = sourceGroups.map((g) => ({
        ...g,
        id: `grp-${Math.random().toString(36).slice(2, 8)}`,
        exerciseIds: g.exerciseIds.map((eid) => idMap.get(eid) || eid),
      }));
      return { ...prev, [targetDayIndex]: clonedGroups };
    });

    toast.success("Gün başarıyla kopyalandı!");
  }, [weekPlan]);

  const handleReorderExercises = useCallback((dayIndex: number, oldIndex: number, newIndex: number) => {
    setWeekPlan((prev) =>
      prev.map((d, i) => {
        if (i !== dayIndex) return d;
        const newExercises = [...d.exercises];
        const [moved] = newExercises.splice(oldIndex, 1);
        newExercises.splice(newIndex, 0, moved);
        return { ...d, exercises: newExercises };
      })
    );
  }, []);

  const handleClearAll = useCallback(() => {
    if (builderMode === "exercise") {
      setWeekPlan(createEmptyWeek());
    } else {
      setSelectedNutrition([]);
    }
  }, [builderMode]);

  // ─── AI Program Generation ───
  const handleAIGenerate = useCallback(async () => {
    setIsAIGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-program', {
        body: { goal: "Hipertrofi", days: 3 },
      });

      if (error) {
        toast.error("AI programı üretilemedi: " + error.message);
        return;
      }

      if (!Array.isArray(data)) {
        toast.error("AI yanıtı beklenmeyen formatta.");
        return;
      }

      const newWeek = createEmptyWeek();
      data.forEach((day: any, index: number) => {
        if (index >= 7) return;
        newWeek[index].label = day.dayName || `${index + 1}. Gün`;
        newWeek[index].blockType = "hypertrophy";
        newWeek[index].exercises = (day.exercises || []).map((ex: any, exIdx: number) => ({
          id: crypto.randomUUID(),
          name: ex.name || "Egzersiz",
          category: "",
          type: "exercise" as const,
          sets: ex.sets || 3,
          reps: parseInt(String(ex.reps).split("-")[0]) || 10,
          rpe: 7,
          rir: 2,
          failureSet: false,
          notes: ex.notes || undefined,
        }));
      });

      setWeekPlan(newWeek);
      setActiveDay(0);
      setDayGroups({});
      toast.success(`✨ AI ${data.length} günlük program üretti!`);
    } catch (err: any) {
      toast.error("AI hatası: " + (err?.message || "Bilinmeyen hata"));
    } finally {
      setIsAIGenerating(false);
    }
  }, []);


  const handleSaveAsTemplate = useCallback(async () => {
    if (!user) {
      toast.error("Giriş yapmalısınız.");
      return;
    }

    const totalExercises = weekPlan.reduce((sum, d) => sum + d.exercises.length, 0);
    if (totalExercises === 0) {
      toast.error("Şablon kaydetmek için en az bir egzersiz ekleyin.");
      return;
    }

    const name = editingProgram?.name
      ? `${editingProgram.name} (Şablon)`
      : `Şablon - ${new Date().toLocaleDateString("tr-TR")}`;

    const routineDays = weekPlan.map((day, i) => ({
      label: day.label,
      notes: day.notes,
      blockType: day.blockType,
      exercises: day.exercises.map(ex => ({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        rir: ex.rir,
        rirPerSet: ex.rirPerSet,
        failureSet: ex.failureSet,
        notes: ex.notes,
        category: ex.category,
      })),
      groups: dayGroups[i] || [],
    }));

    const { error } = await supabase.from("workout_templates").insert({
      name,
      description: editingProgram?.description || null,
      coach_id: user.id,
      routine_days: routineDays as any,
    });

    if (error) {
      toast.error("Şablon kaydedilemedi: " + error.message);
    } else {
      toast.success(`"${name}" şablon olarak kaydedildi!`);
    }
  }, [user, weekPlan, dayGroups, editingProgram]);

  // ─── Supabase atomic save ───
  const handleSaveProgram = useCallback(
    async (meta: { title: string; description: string; difficulty: string; targetGoal: string }) => {
      if (!user) {
        toast.error("Kaydetmek için giriş yapmalısınız.");
        return;
      }

      // ─── Nutrition mode: save to diet_templates ───
      if (builderMode === "nutrition") {
        if (selectedNutrition.length === 0) {
          toast.error("En az bir besin ekleyin.");
          return;
        }

        const mealTypeMap: Record<string, string> = {
          "meal-1": "breakfast",
          "meal-2": "snack",
          "meal-3": "lunch",
          "meal-4": "snack",
          "meal-5": "dinner",
          "meal-6": "snack",
        };

        const totalCals = selectedNutrition.reduce((sum, item) => {
          const factor = item.unit === "adet" ? item.amount : item.amount / 100;
          return sum + (item.kcal || 0) * factor;
        }, 0);
        const daysWithItems = new Set(selectedNutrition.map(i => i.dayIndex)).size;
        const avgDailyCals = daysWithItems > 0 ? Math.round(totalCals / daysWithItems) : 0;

        const { data: template, error: tErr } = await supabase
          .from("diet_templates")
          .insert({
            coach_id: user.id,
            title: meta.title,
            description: meta.description || null,
            target_calories: avgDailyCals,
          })
          .select("id")
          .single();

        if (tErr || !template) {
          toast.error("Diyet şablonu kaydedilemedi: " + (tErr?.message ?? "Bilinmeyen hata"));
          return;
        }

        const foodRows = selectedNutrition
          .filter((item) => item.name.trim())
          .map((item) => ({
            template_id: template.id,
            day_number: item.dayIndex + 1,
            meal_type: mealTypeMap[item.mealId] || "snack",
            food_name: item.name.trim(),
            serving_size: `${item.amount}${item.unit}`,
            calories: Math.round((item.kcal || 0) * (item.unit === "adet" ? item.amount : item.amount / 100)),
            protein: Math.round((item.protein || 0) * (item.unit === "adet" ? item.amount : item.amount / 100)),
            carbs: Math.round((item.carbs || 0) * (item.unit === "adet" ? item.amount : item.amount / 100)),
            fat: Math.round((item.fats || 0) * (item.unit === "adet" ? item.amount : item.amount / 100)),
          }));

        if (foodRows.length > 0) {
          const { error: fErr } = await supabase.from("diet_template_foods").insert(foodRows);
          if (fErr) {
            await supabase.from("diet_templates").delete().eq("id", template.id);
            toast.error("Besinler kaydedilemedi: " + fErr.message);
            return;
          }
        }

        toast.success(`"${meta.title}" beslenme şablonu kaydedildi!`);
        setSelectedNutrition([]);
        setDashboardKey((k) => k + 1);
        setViewMode("dashboard");
        return;
      }

      // ─── Exercise mode (existing logic) ───
      const isEditing = !!editingProgram;
      let programId: string;

      // Build week_config JSON for day metadata + groups
      const weekConfig = weekPlan.map((day, i) => {
        const dayExercises = day.exercises;
        const rawGroups = dayGroups[i] || [];
        
        // Map each group to save BOTH exerciseIds (for frontend) and exerciseIndices (for assignment)
        const mappedGroups = rawGroups.map(g => ({
          id: g.id,
          type: g.type,
          exerciseIds: g.exerciseIds, // RESTORED FOR FRONTEND BUILDER
          exerciseIndices: g.exerciseIds
            .map(id => dayExercises.findIndex(e => e.id === id))
            .filter(idx => idx !== -1)
        }));

        return {
          label: day.label,
          notes: day.notes || "",
          blockType: day.blockType,
          groups: mappedGroups,
        };
      });

      if (isEditing) {
        const { error: progErr } = await supabase
          .from("programs")
          .update({
            title: meta.title,
            description: meta.description || null,
            difficulty: meta.difficulty || null,
            target_goal: meta.targetGoal || null,
            automation_rules: automationRules as any,
            week_config: weekConfig as any,
          })
          .eq("id", editingProgram.id);

        if (progErr) {
          toast.error("Program güncellenemedi: " + progErr.message);
          throw progErr;
        }
        programId = editingProgram.id;
        await supabase.from("exercises").delete().eq("program_id", programId);
      } else {
        const { data: program, error: progErr } = await supabase
          .from("programs")
          .insert({
            title: meta.title,
            description: meta.description || null,
            difficulty: meta.difficulty || null,
            target_goal: meta.targetGoal || null,
            coach_id: user.id,
            automation_rules: automationRules as any,
            week_config: weekConfig as any,
          })
          .select()
          .single();

        if (progErr || !program) {
          toast.error("Program kaydedilemedi: " + (progErr?.message ?? "Bilinmeyen hata"));
          throw progErr;
        }
        programId = program.id;
      }

      // Flatten all 7 days with encoded order_index + rir/failure_set
      const exerciseRows = weekPlan.flatMap((day, dayIdx) =>
        day.exercises.map((ex, exIdx) => ({
          program_id: programId,
          name: ex.name,
          sets: ex.sets,
          reps: String(ex.reps),
          rest_time: null as string | null,
          notes: ex.notes ?? null as string | null,
          order_index: dayIdx * 100 + exIdx,
          rir: ex.rir ?? 2,
          rir_per_set: ex.rirPerSet || null,
          failure_set: ex.failureSet ?? false,
          video_url: ex.videoUrl || null,
        }))
      );

      if (exerciseRows.length > 0) {
        const { error: exErr } = await supabase.from("exercises").insert(exerciseRows);
        if (exErr) {
          if (!isEditing) {
            await supabase.from("programs").delete().eq("id", programId);
          }
          toast.error("Egzersizler kaydedilemedi: " + exErr.message);
          throw exErr;
        }
      }

      toast.success(isEditing ? "Program başarıyla güncellendi!" : "Program başarıyla kaydedildi!");
      setWeekPlan(createEmptyWeek());
      setSelectedNutrition([]);
      setAutomationRules([]);
      setDayGroups({});
      setEditingProgram(null);
      setDashboardKey((k) => k + 1);
      setViewMode("dashboard");
    },
    [user, weekPlan, editingProgram, automationRules, dayGroups, builderMode, selectedNutrition]
  );

  const handleLoadTemplate = useCallback((template: SavedTemplate) => {
    const newWeek = createEmptyWeek();
    const loadedGroups: Record<number, ExerciseGroup[]> = {};

    if (template.routineDays && template.routineDays.length > 0) {
      template.routineDays.forEach((day: any, i: number) => {
        if (i >= 7) return;
        newWeek[i].label = day.label || "";
        newWeek[i].notes = day.notes || "";
        newWeek[i].blockType = day.blockType || "none";

        if (Array.isArray(day.exercises)) {
          newWeek[i].exercises = day.exercises.map((ex: any, idx: number) => ({
            id: `tmpl-${i}-${idx}-${Date.now()}`,
            name: ex.name,
            category: ex.category || "",
            type: "exercise",
            sets: ex.sets ?? 3,
            reps: ex.reps ?? 10,
            rpe: 7,
            rir: ex.rir ?? 2,
            rirPerSet: ex.rirPerSet,
            failureSet: ex.failureSet ?? false,
            notes: ex.notes,
          }));
        }

        if (Array.isArray(day.groups)) {
          loadedGroups[i] = day.groups;
        }
      });
    }

    setWeekPlan(newWeek);
    setDayGroups(loadedGroups);
    setActiveDay(0);
    setBuilderMode("exercise");
    toast.success(`"${template.name}" şablonu yüklendi.`);
  }, []);

  // ─── Save program from dashboard as template ───
  const handleSaveProgramAsTemplate = useCallback(async (program: ProgramData) => {
    if (!user) return;

    // Fetch program exercises and config
    const [{ data: exercises }, { data: progData }] = await Promise.all([
      supabase.from("exercises").select("*").eq("program_id", program.id).order("order_index", { ascending: true }),
      supabase.from("programs").select("week_config").eq("id", program.id).single(),
    ]);

    const tempWeek = createEmptyWeek();
    const weekConfig = (progData?.week_config as any[]) || [];

    weekConfig.forEach((cfg: any, i: number) => {
      if (i < 7) {
        tempWeek[i].label = cfg.label || "";
        tempWeek[i].notes = cfg.notes || "";
        tempWeek[i].blockType = cfg.blockType || "none";
      }
    });

    if (exercises) {
      exercises.forEach((ex) => {
        const dayIndex = Math.min(Math.max(Math.floor((ex.order_index ?? 0) / 100), 0), 6);
        tempWeek[dayIndex].exercises.push({
          id: ex.id,
          name: ex.name,
          category: "",
          type: "exercise",
          sets: ex.sets ?? 3,
          reps: parseInt(ex.reps ?? "10", 10),
          rpe: 7,
          rir: (ex as any).rir ?? 2,
          rirPerSet: Array.isArray((ex as any).rir_per_set) ? (ex as any).rir_per_set : undefined,
          failureSet: (ex as any).failure_set ?? false,
          notes: ex.notes ?? undefined,
        });
      });
    }

    const routineDays = tempWeek.map((day, i) => ({
      label: day.label,
      notes: day.notes,
      blockType: day.blockType,
      exercises: day.exercises.map(ex => ({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        rir: ex.rir,
        rirPerSet: ex.rirPerSet,
        failureSet: ex.failureSet,
        notes: ex.notes,
        category: ex.category,
      })),
      groups: weekConfig[i]?.groups || [],
    }));

    const { error } = await supabase.from("workout_templates").insert({
      name: `${program.name} (Şablon)`,
      description: program.description || null,
      coach_id: user.id,
      routine_days: routineDays as any,
    });

    if (error) {
      toast.error("Şablon kaydedilemedi: " + error.message);
    } else {
      toast.success(`"${program.name}" şablon olarak kaydedildi!`);
    }
  }, [user]);

  const currentItems = builderMode === "exercise" ? allExercises : selectedNutrition;

  // Dashboard View
  if (viewMode === "dashboard") {
    return (
      <ProgramDashboard
        key={dashboardKey}
        onCreateProgram={handleCreateProgram}
        onEditProgram={handleEditProgram}
        onSaveAsTemplate={handleSaveProgramAsTemplate}
      />
    );
  }

  // Builder View
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBackToDashboard}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              {editingProgram ? `Düzenle: ${editingProgram.name}` : "Yeni Program Oluştur"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {builderMode === "exercise"
                ? "7 günlük antrenman programı tasarla ve sporcularına ata"
                : "Beslenme planı oluştur ve sporcularına ata"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="glass rounded-lg px-4 py-2 border border-border flex items-center gap-3">
            <div
              className={`flex items-center gap-2 cursor-pointer ${builderMode === "exercise" ? "text-primary" : "text-muted-foreground"}`}
              onClick={() => setBuilderMode("exercise")}
            >
              <Dumbbell className="w-4 h-4" />
              <Label className="text-sm font-medium cursor-pointer">Antrenman</Label>
            </div>
            <Switch
              id="builder-mode"
              checked={builderMode === "nutrition"}
              onCheckedChange={(checked) => setBuilderMode(checked ? "nutrition" : "exercise")}
            />
            <div
              className={`flex items-center gap-2 cursor-pointer ${builderMode === "nutrition" ? "text-success" : "text-muted-foreground"}`}
              onClick={() => setBuilderMode("nutrition")}
            >
              <Apple className="w-4 h-4" />
              <Label className="text-sm font-medium cursor-pointer">Beslenme</Label>
            </div>
          </div>

          {builderMode === "exercise" && (
            <Button
              variant="outline"
              onClick={handleSaveAsTemplate}
              disabled={allExercises.length === 0}
              className="border-border"
            >
              <Save className="w-4 h-4 mr-1.5" />
              Şablon Kaydet
            </Button>
          )}

          <Button
            onClick={() => setSaveDialogOpen(true)}
            disabled={currentItems.length === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <BookMarked className="w-4 h-4 mr-1.5" />
            {editingProgram ? "Programı Güncelle" : "Programı Kaydet"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-220px)]">
        <div className="lg:col-span-3 h-full">
          <ProgramLibrary
            onAddItem={handleAddItem}
            addedItemIds={weekPlan[activeDay]?.exercises.map((ex) => ex.id) ?? []}
            builderMode={builderMode}
            onLoadTemplate={handleLoadTemplate}
          />
        </div>
        <div className="lg:col-span-5 h-full">
          {builderMode === "exercise" ? (
            <WorkoutBuilder
              weekPlan={weekPlan}
              activeDay={activeDay}
              onSetActiveDay={setActiveDay}
              onUpdateDayLabel={handleUpdateDayLabel}
              onUpdateDayNotes={handleUpdateDayNotes}
              onUpdateDayBlockType={handleUpdateDayBlockType}
              onRemoveExercise={handleRemoveExercise}
              onUpdateExercise={handleUpdateExercise}
              onReorderExercises={handleReorderExercises}
              onClearDay={handleClearDay}
              onDuplicateDay={handleDuplicateDay}
              onClearAll={handleClearAll}
              rules={automationRules}
              onSetRules={setAutomationRules}
              dayGroups={dayGroups}
              onSetDayGroups={setDayGroups}
              onAIGenerate={handleAIGenerate}
              isAIGenerating={isAIGenerating}
            />
          ) : (
            <NutritionBuilder
              selectedItems={selectedNutrition}
              onRemoveItem={handleRemoveNutrition}
              onUpdateItem={handleUpdateNutrition}
              onClearAll={handleClearAll}
              activeMealId={activeMealId}
              setActiveMealId={setActiveMealId}
              activeNutritionDay={activeNutritionDay}
              setActiveNutritionDay={setActiveNutritionDay}
            />
          )}
        </div>
        <div className="lg:col-span-4 h-full">
          <WeeklySchedule
            weekPlan={weekPlan}
            onClearBuilder={handleClearAll}
          />
        </div>
      </div>

      <SaveTemplateDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveProgram}
        mode={builderMode}
        itemCount={currentItems.length}
        editingProgram={editingProgram ? {
          name: editingProgram.name,
          description: editingProgram.description,
          difficulty: editingProgram.difficulty,
          targetGoal: editingProgram.targetGoal,
        } : null}
      />
    </div>
  );
}

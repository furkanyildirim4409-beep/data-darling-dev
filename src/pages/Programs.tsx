import { useState, useCallback } from "react";
import { ProgramDashboard, ProgramData, ProgramType } from "@/components/program-architect/ProgramDashboard";
import { ProgramLibrary, LibraryItem, SavedTemplate } from "@/components/program-architect/ProgramLibrary";
import { WorkoutBuilder, BuilderExercise, DayPlan, BlockType, AutomationRule, ExerciseGroup } from "@/components/program-architect/WorkoutBuilder";
import { NutritionBuilder, NutritionItem } from "@/components/program-architect/NutritionBuilder";
import { SupplementBuilder, SupplementBuilderItem } from "@/components/program-architect/SupplementBuilder";
import { WeeklySchedule } from "@/components/program-architect/WeeklySchedule";
import { SaveTemplateDialog } from "@/components/program-architect/SaveTemplateDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Apple, Pill, BookMarked, ArrowLeft, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useValidExercises } from "@/hooks/useValidExercises";
import { useSupplementTemplates } from "@/hooks/useSupplementTemplates";
import { AIGeneratorModal, AIGenerateParams } from "@/components/program-architect/AIGeneratorModal";

type ViewMode = "dashboard" | "builder";

const createEmptyWeek = (): DayPlan[] =>
  Array.from({ length: 7 }, (_, i) => ({ day: i + 1, label: "", notes: "", blockType: "none" as BlockType, exercises: [] }));

export default function Programs() {
  const { user } = useAuth();
  const { validExerciseNames, exerciseLookup } = useValidExercises();
  const { saveSupplementTemplate, fetchTemplateItems } = useSupplementTemplates();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [builderMode, setBuilderMode] = useState<ProgramType>("exercise");
  const [editingProgram, setEditingProgram] = useState<ProgramData | null>(null);

  // Builder state — 7-day structure
  const [weekPlan, setWeekPlan] = useState<DayPlan[]>(createEmptyWeek());
  const [activeDay, setActiveDay] = useState(0);
  const [selectedNutrition, setSelectedNutrition] = useState<NutritionItem[]>([]);
  const [selectedSupplements, setSelectedSupplements] = useState<SupplementBuilderItem[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [activeMealId, setActiveMealId] = useState("meal-1");
  const [activeNutritionDay, setActiveNutritionDay] = useState(0);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [dayGroups, setDayGroups] = useState<Record<number, ExerciseGroup[]>>({});
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  // Force dashboard refresh key
  const [dashboardKey, setDashboardKey] = useState(0);
  const [isAIGenerating, setIsAIGenerating] = useState(false);

  // Flatten all exercises for compatibility
  const allExercises = weekPlan.flatMap((d) => d.exercises);

  const handleCreateProgram = useCallback((type: ProgramType) => {
    setBuilderMode(type);
    setEditingProgram(null);
    setWeekPlan(createEmptyWeek());
    setActiveDay(0);
    setSelectedNutrition([]);
    setSelectedSupplements([]);
    setAutomationRules([]);
    setDayGroups({});
    setViewMode("builder");
  }, []);

  const handleEditProgram = useCallback(async (program: ProgramData) => {
    setBuilderMode(program.type);
    setEditingProgram(program);
    setViewMode("builder");

    if (program.type === "supplement") {
      const items = await fetchTemplateItems(program.id);
      setSelectedSupplements(items.map((item) => ({
        id: item.id,
        name: item.supplement_name,
        dosage: item.dosage || "",
        timing: item.timing,
        icon: item.icon,
      })));
      toast.info(`"${program.name}" düzenleme modunda açıldı.`);
      return;
    }

    if (program.type === "nutrition") {
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

    const { data: progData } = await supabase
      .from("programs")
      .select("automation_rules, week_config")
      .eq("id", program.id)
      .single();

    const newWeek = createEmptyWeek();

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

    const weekConfig = (progData?.week_config as any[]) || [];
    const loadedGroups: Record<number, ExerciseGroup[]> = {};
    weekConfig.forEach((cfg: any, i: number) => {
      if (i < 7) {
        newWeek[i].label = cfg.label || "";
        newWeek[i].notes = cfg.notes || "";
        newWeek[i].blockType = cfg.blockType || "none";
        
        if (cfg.groups?.length) {
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
  }, [fetchTemplateItems]);

  const handleBackToDashboard = useCallback(() => {
    setViewMode("dashboard");
    setEditingProgram(null);
  }, []);

  const handleAddItem = useCallback(
    (item: LibraryItem) => {
      if (builderMode === "supplement") {
        const newItem: SupplementBuilderItem = {
          id: `${item.id}-${Date.now()}`,
          name: item.name,
          dosage: (item as any).default_dosage || "",
          timing: "Sabah",
          icon: (item as any).icon || "💊",
          category: item.category,
        };
        setSelectedSupplements((prev) => [...prev, newItem]);
        toast.success(`${item.name} listeye eklendi.`);
        return;
      }

      if (builderMode === "exercise") {
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

  const handleRemoveSupplement = useCallback((id: string) => {
    setSelectedSupplements((prev) => prev.filter((s) => s.id !== id));
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

  const handleUpdateSupplement = useCallback(
    (id: string, field: keyof SupplementBuilderItem, value: string) => {
      setSelectedSupplements((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
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
    } else if (builderMode === "nutrition") {
      setSelectedNutrition([]);
    } else {
      setSelectedSupplements([]);
    }
  }, [builderMode]);

  // ─── AI Program Generation ───
  const handleAIGenerate = useCallback(async (params: AIGenerateParams) => {
    if (validExerciseNames.length === 0) {
      toast.error("Egzersiz kütüphanesi yükleniyor, lütfen bekleyin...");
      return;
    }
    setIsAIModalOpen(false);
    setIsAIGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-program', {
        body: {
          goal: params.goal,
          days: params.days,
          level: params.level,
          specialNotes: params.specialNotes,
          validExercises: validExerciseNames,
        },
      });

      if (error) {
        toast.error("AI programı üretilemedi: " + error.message);
        return;
      }

      if (!Array.isArray(data)) {
        toast.error("AI yanıtı beklenmeyen formatta.");
        return;
      }

      const goalBlockMap: Record<string, BlockType> = {
        "Hipertrofi": "hypertrophy",
        "Güç": "strength",
        "Yağ Yakımı": "endurance",
        "Kondisyon": "endurance",
      };
      const blockType = goalBlockMap[params.goal] || "hypertrophy";

      const newWeek = createEmptyWeek();
      data.forEach((day: any, index: number) => {
        if (index >= 7) return;
        newWeek[index].label = day.dayName || `${index + 1}. Gün`;
        newWeek[index].blockType = blockType;
        newWeek[index].exercises = (day.exercises || []).map((ex: any) => {
          const match = exerciseLookup.get((ex.name || "").toLowerCase());
          return {
            id: crypto.randomUUID(),
            name: match?.name || ex.name || "Egzersiz",
            category: match?.category || "",
            type: "exercise" as const,
            sets: ex.sets || 3,
            reps: parseInt(String(ex.reps).split("-")[0]) || 10,
            rpe: 7,
            rir: 2,
            failureSet: false,
            notes: ex.notes || undefined,
            videoUrl: match?.video_url || undefined,
          };
        });
      });

      setWeekPlan(newWeek);
      setActiveDay(0);
      setDayGroups({});
      toast.success(`✨ AI ${data.length} günlük ${params.goal} programı üretti!`);
    } catch (err: any) {
      toast.error("AI hatası: " + (err?.message || "Bilinmeyen hata"));
    } finally {
      setIsAIGenerating(false);
    }
  }, [validExerciseNames, exerciseLookup]);


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

      // ─── Supplement mode ───
      if (builderMode === "supplement") {
        if (selectedSupplements.length === 0) {
          toast.error("En az bir takviye ekleyin.");
          return;
        }

        const items = selectedSupplements.map((s) => ({
          supplement_name: s.name,
          dosage: s.dosage,
          timing: s.timing,
          icon: s.icon,
        }));

        const ok = await saveSupplementTemplate(
          meta.title,
          meta.description,
          items,
          editingProgram?.id
        );

        if (ok) {
          setSelectedSupplements([]);
          setEditingProgram(null);
          setDashboardKey((k) => k + 1);
          setViewMode("dashboard");
        }
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

        const isEditing = !!editingProgram;
        let templateId: string;

        if (isEditing) {
          const { error: tErr } = await supabase
            .from("diet_templates")
            .update({
              title: meta.title,
              description: meta.description || null,
              target_calories: avgDailyCals,
            })
            .eq("id", editingProgram.id);

          if (tErr) {
            toast.error("Diyet şablonu güncellenemedi: " + tErr.message);
            return;
          }
          templateId = editingProgram.id;
          await supabase.from("diet_template_foods").delete().eq("template_id", templateId);
        } else {
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
          templateId = template.id;
        }

        const foodRows = selectedNutrition
          .filter((item) => item.name.trim())
          .map((item) => ({
            template_id: templateId,
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
            if (!isEditing) {
              await supabase.from("diet_templates").delete().eq("id", templateId);
            }
            toast.error("Besinler kaydedilemedi: " + fErr.message);
            return;
          }
        }

        toast.success(isEditing ? `"${meta.title}" beslenme şablonu güncellendi!` : `"${meta.title}" beslenme şablonu kaydedildi!`);
        setSelectedNutrition([]);
        setDashboardKey((k) => k + 1);
        setViewMode("dashboard");
        return;
      }

      // ─── Exercise mode (existing logic) ───
      const isEditing = !!editingProgram;
      let programId: string;

      const weekConfig = weekPlan.map((day, i) => {
        const dayExercises = day.exercises;
        const rawGroups = dayGroups[i] || [];
        
        const mappedGroups = rawGroups.map(g => ({
          id: g.id,
          type: g.type,
          exerciseIds: g.exerciseIds,
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
      setSelectedSupplements([]);
      setAutomationRules([]);
      setDayGroups({});
      setEditingProgram(null);
      setDashboardKey((k) => k + 1);
      setViewMode("dashboard");
    },
    [user, weekPlan, editingProgram, automationRules, dayGroups, builderMode, selectedNutrition, selectedSupplements, saveSupplementTemplate]
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

  const currentItems = builderMode === "exercise" ? allExercises : builderMode === "nutrition" ? selectedNutrition : selectedSupplements;

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
                : builderMode === "nutrition"
                  ? "Beslenme planı oluştur ve sporcularına ata"
                  : "Takviye programı oluştur ve sporcularına ata"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 3-way segmented control */}
          <div className="glass rounded-lg px-1 py-1 border border-border flex items-center gap-1">
            <button
              onClick={() => setBuilderMode("exercise")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                builderMode === "exercise"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Dumbbell className="w-4 h-4" />
              Antrenman
            </button>
            <button
              onClick={() => setBuilderMode("nutrition")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                builderMode === "nutrition"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Apple className="w-4 h-4" />
              Beslenme
            </button>
            <button
              onClick={() => setBuilderMode("supplement")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                builderMode === "supplement"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Pill className="w-4 h-4" />
              Takviye
            </button>
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

      <div className={cn(
        "grid grid-cols-1 gap-4 h-[calc(100vh-220px)]",
        builderMode === "supplement" ? "lg:grid-cols-2" : "lg:grid-cols-12"
      )}>
        <div className={builderMode === "supplement" ? "h-full" : "lg:col-span-3 h-full"}>
          <ProgramLibrary
            onAddItem={handleAddItem}
            addedItemIds={weekPlan[activeDay]?.exercises.map((ex) => ex.id) ?? []}
            builderMode={builderMode}
            onLoadTemplate={handleLoadTemplate}
          />
        </div>
        <div className={builderMode === "supplement" ? "h-full" : "lg:col-span-5 h-full"}>
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
              onAIGenerate={() => setIsAIModalOpen(true)}
              isAIGenerating={isAIGenerating}
            />
          ) : builderMode === "nutrition" ? (
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
          ) : (
            <SupplementBuilder
              items={selectedSupplements}
              onRemoveItem={handleRemoveSupplement}
              onUpdateItem={handleUpdateSupplement}
              onClearAll={handleClearAll}
            />
          )}
        </div>
        {builderMode !== "supplement" && (
          <div className="lg:col-span-4 h-full">
            <WeeklySchedule
              weekPlan={weekPlan}
              onClearBuilder={handleClearAll}
            />
          </div>
        )}
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

      <AIGeneratorModal
        open={isAIModalOpen}
        onOpenChange={setIsAIModalOpen}
        onGenerate={handleAIGenerate}
        isGenerating={isAIGenerating}
      />
    </div>
  );
}

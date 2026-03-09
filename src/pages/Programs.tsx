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
import { Dumbbell, Apple, BookMarked, ArrowLeft } from "lucide-react";
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
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [activeMealId, setActiveMealId] = useState("meal-1");
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [dayGroups, setDayGroups] = useState<Record<number, ExerciseGroup[]>>({});

  // Force dashboard refresh key
  const [dashboardKey, setDashboardKey] = useState(0);

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

    // Restore week_config (labels, blockTypes, groups)
    const weekConfig = (progData?.week_config as any[]) || [];
    const loadedGroups: Record<number, ExerciseGroup[]> = {};
    weekConfig.forEach((cfg: any, i: number) => {
      if (i < 7) {
        newWeek[i].label = cfg.label || "";
        newWeek[i].notes = cfg.notes || "";
        newWeek[i].blockType = cfg.blockType || "none";
        if (cfg.groups?.length) loadedGroups[i] = cfg.groups;
      }
    });
    setDayGroups(loadedGroups);
    setAutomationRules((progData?.automation_rules as unknown as AutomationRule[]) || []);

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
          failureSet: (ex as any).failure_set ?? false,
          notes: ex.notes ?? undefined,
        };
        newWeek[clampedDay].exercises.push(mapped);
      });
    }

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
        const newExercise: BuilderExercise = { ...item, sets: 3, reps: 10, rpe: 7, rir: 2, failureSet: false };
        setWeekPlan((prev) =>
          prev.map((d, i) =>
            i === activeDay ? { ...d, exercises: [...d.exercises, newExercise] } : d
          )
        );
      } else {
        const newNutrition: NutritionItem = {
          ...item,
          amount: 100,
          unit: item.name.includes("(Adet)") ? "adet" : "g",
          mealId: activeMealId,
        };
        setSelectedNutrition((prev) => [...prev, newNutrition]);
        toast.success(`${item.name} listeye eklendi.`);
      }
    },
    [builderMode, weekPlan, activeDay, activeMealId]
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
    (dayIndex: number, id: string, field: keyof BuilderExercise, value: number | string) => {
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

  const handleClearAll = useCallback(() => {
    if (builderMode === "exercise") {
      setWeekPlan(createEmptyWeek());
    } else {
      setSelectedNutrition([]);
    }
  }, [builderMode]);

  // ─── Supabase atomic save ───
  const handleSaveProgram = useCallback(
    async (meta: { title: string; description: string; difficulty: string; targetGoal: string }) => {
      if (!user) {
        toast.error("Kaydetmek için giriş yapmalısınız.");
        return;
      }

      const isEditing = !!editingProgram;
      let programId: string;

      // Build week_config JSON for day metadata + groups
      const weekConfig = weekPlan.map((day, i) => ({
        label: day.label,
        notes: day.notes || "",
        blockType: day.blockType,
        groups: dayGroups[i] || [],
      }));

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
          failure_set: ex.failureSet ?? false,
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
    [user, weekPlan, editingProgram, automationRules, dayGroups]
  );

  const handleLoadTemplate = useCallback((template: SavedTemplate) => {
    if (template.type === "exercise") {
      // Load template into active day
      const exercises = template.items.map((item) => ({ ...item, sets: 3, reps: 10, rpe: 7, rir: 2, failureSet: false }) as BuilderExercise);
      setWeekPlan((prev) =>
        prev.map((d, i) => (i === activeDay ? { ...d, exercises } : d))
      );
      setBuilderMode("exercise");
    } else {
      setSelectedNutrition(
        template.items.map((item) => ({ ...item, amount: 100, unit: "g", mealId: "meal-1" }) as NutritionItem)
      );
      setBuilderMode("nutrition");
    }
    toast.success(`"${template.name}" şablonu yüklendi.`);
  }, [activeDay]);

  const currentItems = builderMode === "exercise" ? allExercises : selectedNutrition;

  // Dashboard View
  if (viewMode === "dashboard") {
    return (
      <ProgramDashboard
        key={dashboardKey}
        onCreateProgram={handleCreateProgram}
        onEditProgram={handleEditProgram}
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
            savedTemplates={savedTemplates}
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
              onClearDay={handleClearDay}
              onClearAll={handleClearAll}
              rules={automationRules}
              onSetRules={setAutomationRules}
              dayGroups={dayGroups}
              onSetDayGroups={setDayGroups}
            />
          ) : (
            <NutritionBuilder
              selectedItems={selectedNutrition}
              onRemoveItem={handleRemoveNutrition}
              onUpdateItem={handleUpdateNutrition}
              onClearAll={handleClearAll}
              activeMealId={activeMealId}
              setActiveMealId={setActiveMealId}
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

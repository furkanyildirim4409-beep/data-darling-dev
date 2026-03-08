import { useState, useCallback } from "react";
import { ProgramDashboard, ProgramData } from "@/components/program-architect/ProgramDashboard";
import { ProgramLibrary, LibraryItem, SavedTemplate } from "@/components/program-architect/ProgramLibrary";
import { WorkoutBuilder, BuilderExercise } from "@/components/program-architect/WorkoutBuilder";
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

export default function Programs() {
  const { user } = useAuth();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [builderMode, setBuilderMode] = useState<"exercise" | "nutrition">("exercise");
  const [editingProgram, setEditingProgram] = useState<ProgramData | null>(null);

  // Builder state
  const [selectedExercises, setSelectedExercises] = useState<BuilderExercise[]>([]);
  const [selectedNutrition, setSelectedNutrition] = useState<NutritionItem[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [activeMealId, setActiveMealId] = useState("meal-1");

  // Force dashboard refresh key
  const [dashboardKey, setDashboardKey] = useState(0);

  const handleCreateProgram = useCallback((type: "exercise" | "nutrition") => {
    setBuilderMode(type);
    setEditingProgram(null);
    setSelectedExercises([]);
    setSelectedNutrition([]);
    setViewMode("builder");
  }, []);

  const handleEditProgram = useCallback(async (program: ProgramData) => {
    setBuilderMode(program.type);
    setEditingProgram(program);
    setViewMode("builder");

    // Fetch existing exercises from Supabase
    const { data: exercises, error } = await supabase
      .from("exercises")
      .select("*")
      .eq("program_id", program.id)
      .order("order_index", { ascending: true });

    if (error) {
      toast.error("Egzersizler yüklenemedi: " + error.message);
      return;
    }

    if (exercises && exercises.length > 0) {
      const mapped: BuilderExercise[] = exercises.map((ex) => ({
        id: ex.id,
        name: ex.name,
        category: "",
        type: "exercise",
        sets: ex.sets ?? 3,
        reps: parseInt(ex.reps ?? "10", 10),
        rpe: 7,
        notes: ex.notes ?? undefined,
      }));
      setSelectedExercises(mapped);
    } else {
      setSelectedExercises([]);
    }

    toast.info(`"${program.name}" düzenleme modunda açıldı.`);
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setViewMode("dashboard");
    setEditingProgram(null);
  }, []);

  const handleAddItem = useCallback(
    (item: LibraryItem) => {
      if (builderMode === "exercise") {
        if (selectedExercises.find((ex) => ex.id === item.id)) return;
        const newExercise: BuilderExercise = { ...item, sets: 3, reps: 10, rpe: 7 };
        setSelectedExercises((prev) => [...prev, newExercise]);
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
    [builderMode, selectedExercises, activeMealId]
  );

  const handleRemoveExercise = useCallback((id: string) => {
    setSelectedExercises((prev) => prev.filter((ex) => ex.id !== id));
  }, []);

  const handleRemoveNutrition = useCallback((id: string) => {
    setSelectedNutrition((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleUpdateExercise = useCallback(
    (id: string, field: keyof BuilderExercise, value: number | string) => {
      setSelectedExercises((prev) =>
        prev.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex))
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

  const handleClearAll = useCallback(() => {
    if (builderMode === "exercise") {
      setSelectedExercises([]);
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

      // Step A: Insert program
      const { data: program, error: progErr } = await supabase
        .from("programs")
        .insert({
          title: meta.title,
          description: meta.description || null,
          difficulty: meta.difficulty || null,
          target_goal: meta.targetGoal || null,
          coach_id: user.id,
        })
        .select()
        .single();

      if (progErr || !program) {
        toast.error("Program kaydedilemedi: " + (progErr?.message ?? "Bilinmeyen hata"));
        throw progErr;
      }

      // Step C: Bulk insert exercises
      if (selectedExercises.length > 0) {
        const exerciseRows = selectedExercises.map((ex, idx) => ({
          program_id: program.id,
          name: ex.name,
          sets: ex.sets,
          reps: String(ex.reps),
          rest_time: null as string | null,
          notes: null as string | null,
          order_index: idx,
        }));

        const { error: exErr } = await supabase.from("exercises").insert(exerciseRows);
        if (exErr) {
          // Rollback: delete the program we just created
          await supabase.from("programs").delete().eq("id", program.id);
          toast.error("Egzersizler kaydedilemedi: " + exErr.message);
          throw exErr;
        }
      }

      toast.success("Program başarıyla kaydedildi!");
      // Clear and go back
      setSelectedExercises([]);
      setSelectedNutrition([]);
      setDashboardKey((k) => k + 1);
      setViewMode("dashboard");
    },
    [user, selectedExercises]
  );

  const handleLoadTemplate = useCallback((template: SavedTemplate) => {
    if (template.type === "exercise") {
      setSelectedExercises(
        template.items.map((item) => ({ ...item, sets: 3, reps: 10, rpe: 7 }) as BuilderExercise)
      );
      setBuilderMode("exercise");
    } else {
      setSelectedNutrition(
        template.items.map((item) => ({ ...item, amount: 100, unit: "g", mealId: "meal-1" }) as NutritionItem)
      );
      setBuilderMode("nutrition");
    }
    toast.success(`"${template.name}" şablonu yüklendi.`);
  }, []);

  const currentItems = builderMode === "exercise" ? selectedExercises : selectedNutrition;

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
                ? "Antrenman bloğu tasarla ve sporcularına ata"
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
            Programı Kaydet
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-220px)]">
        <div className="lg:col-span-3 h-full">
          <ProgramLibrary
            onAddItem={handleAddItem}
            addedItemIds={currentItems.map((item) => item.id)}
            builderMode={builderMode}
            savedTemplates={savedTemplates}
            onLoadTemplate={handleLoadTemplate}
          />
        </div>
        <div className="lg:col-span-5 h-full">
          {builderMode === "exercise" ? (
            <WorkoutBuilder
              selectedExercises={selectedExercises}
              onRemoveExercise={handleRemoveExercise}
              onUpdateExercise={handleUpdateExercise}
              onClearAll={handleClearAll}
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
            selectedExercises={selectedExercises}
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
      />
    </div>
  );
}

import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgramDashboard, type ProgramData } from "@/components/program-architect/ProgramDashboard";
import { ProgramLibrary, type LibraryItem, type SavedTemplate } from "@/components/program-architect/ProgramLibrary";
import { WorkoutBuilder, type BuilderExercise } from "@/components/program-architect/WorkoutBuilder";
import { WeeklySchedule } from "@/components/program-architect/WeeklySchedule";
import { NutritionBuilder, type NutritionItem } from "@/components/program-architect/NutritionBuilder";
import TemplateDashboard, { type WorkoutTemplate } from "@/components/program-architect/TemplateDashboard";
import RoutineBuilder from "@/components/program-architect/RoutineBuilder";
import AssignTemplateDialog from "@/components/program-architect/AssignTemplateDialog";
import { Dumbbell, LayoutTemplate } from "lucide-react";

type ArchitectView = "dashboard" | "builder";
type TemplateView = "dashboard" | "builder";

export default function Programs() {
  // --- Program Mimarı state ---
  const [architectView, setArchitectView] = useState<ArchitectView>("dashboard");
  const [architectMode, setArchitectMode] = useState<"exercise" | "nutrition">("exercise");
  const [selectedExercises, setSelectedExercises] = useState<BuilderExercise[]>([]);
  const [selectedNutritionItems, setSelectedNutritionItems] = useState<NutritionItem[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [activeMealId, setActiveMealId] = useState("meal-1");

  // --- Şablon Kütüphanesi state ---
  const [templateView, setTemplateView] = useState<TemplateView>("dashboard");
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [assignTemplate, setAssignTemplate] = useState<WorkoutTemplate | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [dashboardKey, setDashboardKey] = useState(0);

  // Program Mimarı handlers
  const handleCreateProgram = useCallback((type: "exercise" | "nutrition") => {
    setArchitectMode(type);
    setSelectedExercises([]);
    setSelectedNutritionItems([]);
    setArchitectView("builder");
  }, []);

  const handleEditProgram = useCallback((program: ProgramData) => {
    setArchitectMode(program.type);
    setArchitectView("builder");
  }, []);

  const handleArchitectBack = useCallback(() => {
    setArchitectView("dashboard");
  }, []);

  const handleAddLibraryItem = useCallback((item: LibraryItem) => {
    if (architectMode === "exercise") {
      setSelectedExercises((prev) => {
        if (prev.find((e) => e.id === item.id)) return prev;
        return [...prev, { ...item, sets: 3, reps: 10, rpe: 7 }];
      });
    } else {
      setSelectedNutritionItems((prev) => {
        if (prev.find((e) => e.id === item.id)) return prev;
        return [...prev, { ...item, amount: 100, unit: "g", mealId: activeMealId }];
      });
    }
  }, [architectMode, activeMealId]);

  const handleRemoveExercise = useCallback((id: string) => {
    setSelectedExercises((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleUpdateExercise = useCallback((id: string, field: keyof BuilderExercise, value: number | string) => {
    setSelectedExercises((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  }, []);

  const handleRemoveNutritionItem = useCallback((id: string) => {
    setSelectedNutritionItems((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleUpdateNutritionItem = useCallback((id: string, field: keyof NutritionItem, value: number | string) => {
    setSelectedNutritionItems((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedExercises([]);
    setSelectedNutritionItems([]);
  }, []);

  const handleLoadTemplate = useCallback((template: SavedTemplate) => {
    if (template.type === "exercise") {
      setSelectedExercises(template.items.map((item) => ({ ...item, sets: 3, reps: 10, rpe: 7 })));
    }
  }, []);

  // Şablon Kütüphanesi handlers
  const handleTemplateCreate = useCallback(() => {
    setEditingTemplate(null);
    setTemplateView("builder");
  }, []);

  const handleTemplateEdit = useCallback((t: WorkoutTemplate) => {
    setEditingTemplate(t);
    setTemplateView("builder");
  }, []);

  const handleTemplateAssign = useCallback((t: WorkoutTemplate) => {
    setAssignTemplate(t);
    setAssignOpen(true);
  }, []);

  const handleTemplateBack = useCallback(() => {
    setTemplateView("dashboard");
    setEditingTemplate(null);
  }, []);

  const handleTemplateSaved = useCallback(() => {
    setDashboardKey((k) => k + 1);
    setTemplateView("dashboard");
    setEditingTemplate(null);
  }, []);

  const addedItemIds = architectMode === "exercise"
    ? selectedExercises.map((e) => e.id)
    : selectedNutritionItems.map((e) => e.id);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="architect" className="w-full">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="architect" className="flex items-center gap-1.5 data-[state=active]:bg-background">
            <Dumbbell className="w-4 h-4" />
            Program Mimarı
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1.5 data-[state=active]:bg-background">
            <LayoutTemplate className="w-4 h-4" />
            Şablon Kütüphanesi
          </TabsTrigger>
        </TabsList>

        {/* ─── Program Mimarı Tab ─── */}
        <TabsContent value="architect">
          {architectView === "dashboard" ? (
            <ProgramDashboard
              onCreateProgram={handleCreateProgram}
              onEditProgram={handleEditProgram}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_300px] gap-4">
              <ProgramLibrary
                onAddItem={handleAddLibraryItem}
                addedItemIds={addedItemIds}
                builderMode={architectMode}
                savedTemplates={savedTemplates}
                onLoadTemplate={handleLoadTemplate}
              />
              {architectMode === "exercise" ? (
                <WorkoutBuilder
                  selectedExercises={selectedExercises}
                  onRemoveExercise={handleRemoveExercise}
                  onUpdateExercise={handleUpdateExercise}
                  onClearAll={handleClearAll}
                />
              ) : (
                <NutritionBuilder
                  selectedItems={selectedNutritionItems}
                  onRemoveItem={handleRemoveNutritionItem}
                  onUpdateItem={handleUpdateNutritionItem}
                  onClearAll={handleClearAll}
                  activeMealId={activeMealId}
                  setActiveMealId={setActiveMealId}
                />
              )}
              <WeeklySchedule
                selectedExercises={selectedExercises}
                onClearBuilder={handleClearAll}
              />
            </div>
          )}
        </TabsContent>

        {/* ─── Şablon Kütüphanesi Tab ─── */}
        <TabsContent value="templates">
          {templateView === "dashboard" ? (
            <TemplateDashboard
              key={dashboardKey}
              onCreateNew={handleTemplateCreate}
              onEdit={handleTemplateEdit}
              onAssign={handleTemplateAssign}
            />
          ) : (
            <RoutineBuilder
              editingTemplate={editingTemplate}
              onBack={handleTemplateBack}
              onSaved={handleTemplateSaved}
            />
          )}
          <AssignTemplateDialog
            open={assignOpen}
            onOpenChange={setAssignOpen}
            template={assignTemplate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

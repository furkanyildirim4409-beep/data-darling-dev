import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Dumbbell, Apple, Plus, BookMarked, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ExerciseLibraryEditor } from "./ExerciseLibraryEditor";

const STORAGE_KEY = "coach-exercise-library";

// 20 real fitness exercises with muscle group tags
export const defaultExercises = [
  { id: "ex-1", name: "Bench Press", category: "Göğüs", type: "exercise", muscleGroup: "Pectoralis Major" },
  { id: "ex-2", name: "Squat", category: "Bacak", type: "exercise", muscleGroup: "Quadriceps" },
  { id: "ex-3", name: "Deadlift", category: "Sırt", type: "exercise", muscleGroup: "Erector Spinae" },
  { id: "ex-4", name: "Overhead Press", category: "Omuz", type: "exercise", muscleGroup: "Deltoids" },
  { id: "ex-5", name: "Barbell Row", category: "Sırt", type: "exercise", muscleGroup: "Latissimus Dorsi" },
  { id: "ex-6", name: "Pull-up", category: "Sırt", type: "exercise", muscleGroup: "Latissimus Dorsi" },
  { id: "ex-7", name: "Romanian Deadlift", category: "Bacak", type: "exercise", muscleGroup: "Hamstrings" },
  { id: "ex-8", name: "Leg Press", category: "Bacak", type: "exercise", muscleGroup: "Quadriceps" },
  { id: "ex-9", name: "Dumbbell Curl", category: "Kol", type: "exercise", muscleGroup: "Biceps" },
  { id: "ex-10", name: "Tricep Pushdown", category: "Kol", type: "exercise", muscleGroup: "Triceps" },
  { id: "ex-11", name: "Lat Pulldown", category: "Sırt", type: "exercise", muscleGroup: "Latissimus Dorsi" },
  { id: "ex-12", name: "Incline Bench Press", category: "Göğüs", type: "exercise", muscleGroup: "Upper Pectoralis" },
  { id: "ex-13", name: "Leg Curl", category: "Bacak", type: "exercise", muscleGroup: "Hamstrings" },
  { id: "ex-14", name: "Leg Extension", category: "Bacak", type: "exercise", muscleGroup: "Quadriceps" },
  { id: "ex-15", name: "Lateral Raise", category: "Omuz", type: "exercise", muscleGroup: "Lateral Deltoid" },
  { id: "ex-16", name: "Face Pull", category: "Omuz", type: "exercise", muscleGroup: "Rear Deltoid" },
  { id: "ex-17", name: "Cable Fly", category: "Göğüs", type: "exercise", muscleGroup: "Pectoralis Major" },
  { id: "ex-18", name: "Hip Thrust", category: "Bacak", type: "exercise", muscleGroup: "Gluteus Maximus" },
  { id: "ex-19", name: "Calf Raise", category: "Bacak", type: "exercise", muscleGroup: "Gastrocnemius" },
  { id: "ex-20", name: "Skull Crusher", category: "Kol", type: "exercise", muscleGroup: "Triceps" },
];

export const nutrition = [
  { id: "nut-1", name: "Yulaf Ezmesi", category: "Karbonhidrat", type: "nutrition", kcal: 389 },
  { id: "nut-2", name: "Tavuk Göğsü", category: "Protein", type: "nutrition", kcal: 165 },
  { id: "nut-3", name: "Pirinç", category: "Karbonhidrat", type: "nutrition", kcal: 130 },
  { id: "nut-4", name: "Yumurta", category: "Protein", type: "nutrition", kcal: 155 },
  { id: "nut-5", name: "Avokado", category: "Yağ", type: "nutrition", kcal: 160 },
  { id: "nut-6", name: "Somon", category: "Protein", type: "nutrition", kcal: 208 },
  { id: "nut-7", name: "Tatlı Patates", category: "Karbonhidrat", type: "nutrition", kcal: 86 },
  { id: "nut-8", name: "Badem", category: "Yağ", type: "nutrition", kcal: 579 },
  { id: "nut-9", name: "Brokoli", category: "Sebze", type: "nutrition", kcal: 34 },
  { id: "nut-10", name: "Whey Protein", category: "Takviye", type: "nutrition", kcal: 120 },
  { id: "nut-11", name: "Zeytinyağı", category: "Yağ", type: "nutrition", kcal: 884 },
  { id: "nut-12", name: "Kinoa", category: "Karbonhidrat", type: "nutrition", kcal: 120 },
  { id: "nut-13", name: "Dana Kıyma", category: "Protein", type: "nutrition", kcal: 250 },
  { id: "nut-14", name: "Fıstık Ezmesi", category: "Yağ", type: "nutrition", kcal: 588 },
  { id: "nut-15", name: "Muz", category: "Meyve", type: "nutrition", kcal: 89 },
];

export interface LibraryItem {
  id: string;
  name: string;
  category: string;
  type: string;
  muscleGroup?: string;
  kcal?: number;
  gifUrl?: string;
}

export interface SavedTemplate {
  id: string;
  name: string;
  description?: string;
  items: LibraryItem[];
  routineDays: any[];
  type: "exercise" | "nutrition";
  createdAt: Date;
  exerciseCount: number;
  dayCount: number;
}

interface LibraryItemCardProps {
  item: LibraryItem;
  onAdd: (item: LibraryItem) => void;
  isAdded: boolean;
}

function LibraryItemCard({ item, onAdd, isAdded }: LibraryItemCardProps) {
  return (
    <div
      className={cn(
        "glass rounded-lg p-3 transition-all border border-border group",
        isAdded 
          ? "opacity-50 bg-muted/30" 
          : "glass-hover cursor-pointer hover:border-primary/50"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground">{item.category}</p>
            {item.muscleGroup && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary/70">
                {item.muscleGroup}
              </Badge>
            )}
            {item.kcal && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-success/30 text-success/70">
                {item.kcal} kcal
              </Badge>
            )}
          </div>
        </div>
        {item.type === "exercise" ? (
          <Dumbbell className="w-4 h-4 text-primary/60 shrink-0" />
        ) : (
          <Apple className="w-4 h-4 text-success/60 shrink-0" />
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 shrink-0 transition-all",
            isAdded 
              ? "opacity-0 pointer-events-none" 
              : "opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onAdd(item);
          }}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

interface ProgramLibraryProps {
  onAddItem: (item: LibraryItem) => void;
  addedItemIds: string[];
  builderMode: "exercise" | "nutrition";
  onLoadTemplate: (template: SavedTemplate) => void;
}

export function ProgramLibrary({ 
  onAddItem, 
  addedItemIds, 
  builderMode,
  onLoadTemplate
}: ProgramLibraryProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"items" | "templates">("items");
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Stateful exercise library with localStorage persistence
  const [exercises, setExercises] = useState<LibraryItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : defaultExercises;
    } catch {
      return defaultExercises;
    }
  });

  const handleExercisesChange = useCallback((newExercises: LibraryItem[]) => {
    setExercises(newExercises);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newExercises));
  }, []);

  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    setLoadingTemplates(true);
    const { data, error } = await supabase
      .from("workout_templates")
      .select("*")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTemplates(data.map(t => {
        const routineDays = Array.isArray(t.routine_days) ? (t.routine_days as any[]) : [];
        const exerciseCount = routineDays.reduce((sum: number, day: any) => 
          sum + (Array.isArray(day?.exercises) ? day.exercises.length : 0), 0);
        const dayCount = routineDays.filter((day: any) => 
          Array.isArray(day?.exercises) && day.exercises.length > 0).length;

        return {
          id: t.id,
          name: t.name,
          description: t.description ?? undefined,
          items: [],
          routineDays,
          type: "exercise" as const,
          createdAt: new Date(t.created_at ?? Date.now()),
          exerciseCount,
          dayCount,
        };
      }));
    }
    setLoadingTemplates(false);
  }, [user]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDeleteTemplate = async (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    const { error } = await supabase.from("workout_templates").delete().eq("id", templateId);
    if (error) {
      toast.error("Şablon silinemedi");
    } else {
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success("Şablon silindi");
    }
  };

  const filteredExercises = exercises.filter(
    (ex) =>
      ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.muscleGroup?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredNutrition = nutrition.filter(
    (nut) =>
      nut.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nut.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTemplates = templates.filter(
    (t) => t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentItems = builderMode === "exercise" ? filteredExercises : filteredNutrition;

  return (
    <div className="glass rounded-xl border border-border h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Kütüphane</h2>
          {builderMode === "exercise" && (
            <ExerciseLibraryEditor exercises={exercises} onExercisesChange={handleExercisesChange} />
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background/50 border-border"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "items" | "templates")} className="flex-1 flex flex-col">
        <div className="px-4 pt-3">
          <TabsList className="w-full bg-muted/50">
            <TabsTrigger value="items" className="flex-1 text-xs">
              {builderMode === "exercise" ? (
                <>
                  <Dumbbell className="w-3 h-3 mr-1.5" />
                  Egzersizler ({exercises.length})
                </>
              ) : (
                <>
                  <Apple className="w-3 h-3 mr-1.5" />
                  Besinler ({nutrition.length})
                </>
              )}
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex-1 text-xs">
              <BookMarked className="w-3 h-3 mr-1.5" />
              Şablonlarım ({templates.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1 px-4 py-3">
          <TabsContent value="items" className="mt-0 space-y-2">
            {currentItems.map((item) => (
              <LibraryItemCard
                key={item.id}
                item={item}
                onAdd={onAddItem}
                isAdded={addedItemIds.includes(item.id)}
              />
            ))}
            {currentItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {builderMode === "exercise" ? "Egzersiz bulunamadı" : "Besin bulunamadı"}
              </p>
            )}
          </TabsContent>

          <TabsContent value="templates" className="mt-0 space-y-2">
            {loadingTemplates ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookMarked className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Henüz kayıtlı şablon yok</p>
                <p className="text-xs mt-1">Program oluşturup "Şablon Olarak Kaydet" butonuna tıklayın</p>
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="glass rounded-lg p-3 border border-border hover:border-primary/50 transition-all cursor-pointer group"
                  onClick={() => onLoadTemplate(template)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{template.name}</p>
                      {template.description && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{template.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-border text-muted-foreground">
                          {template.exerciseCount} egzersiz
                        </Badge>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-border text-muted-foreground">
                          {template.dayCount} gün
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {template.createdAt.toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDeleteTemplate(e, template.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 text-xs"
                      >
                        Yükle
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Quick Stats */}
      <div className="p-4 border-t border-border bg-muted/20">
        <p className="text-xs text-muted-foreground text-center">
          {builderMode === "exercise" 
            ? `Toplam: ${exercises.length} egzersiz`
            : `Toplam: ${nutrition.length} besin`
          }
        </p>
      </div>
    </div>
  );
}

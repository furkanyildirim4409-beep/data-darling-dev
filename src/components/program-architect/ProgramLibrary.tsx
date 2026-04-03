import { useState, useEffect, useCallback, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Dumbbell, Apple, Pill, Plus, BookMarked, Trash2, Loader2, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ExerciseLibraryEditor } from "./ExerciseLibraryEditor";
import { usePermissions } from "@/hooks/usePermissions";

const TOTAL_EXERCISE_COUNT = 1324;
const PAGE_SIZE = 50;

// Default exercises to seed when table is empty
const defaultExercises = [
  { name: "Bench Press", category: "Göğüs", target_muscle: "Pectoralis Major" },
  { name: "Squat", category: "Bacak", target_muscle: "Quadriceps" },
  { name: "Deadlift", category: "Sırt", target_muscle: "Erector Spinae" },
  { name: "Overhead Press", category: "Omuz", target_muscle: "Deltoids" },
  { name: "Barbell Row", category: "Sırt", target_muscle: "Latissimus Dorsi" },
  { name: "Pull-up", category: "Sırt", target_muscle: "Latissimus Dorsi" },
  { name: "Romanian Deadlift", category: "Bacak", target_muscle: "Hamstrings" },
  { name: "Leg Press", category: "Bacak", target_muscle: "Quadriceps" },
  { name: "Dumbbell Curl", category: "Kol", target_muscle: "Biceps" },
  { name: "Tricep Pushdown", category: "Kol", target_muscle: "Triceps" },
  { name: "Lat Pulldown", category: "Sırt", target_muscle: "Latissimus Dorsi" },
  { name: "Incline Bench Press", category: "Göğüs", target_muscle: "Upper Pectoralis" },
  { name: "Leg Curl", category: "Bacak", target_muscle: "Hamstrings" },
  { name: "Leg Extension", category: "Bacak", target_muscle: "Quadriceps" },
  { name: "Lateral Raise", category: "Omuz", target_muscle: "Lateral Deltoid" },
  { name: "Face Pull", category: "Omuz", target_muscle: "Rear Deltoid" },
  { name: "Cable Fly", category: "Göğüs", target_muscle: "Pectoralis Major" },
  { name: "Hip Thrust", category: "Bacak", target_muscle: "Gluteus Maximus" },
  { name: "Calf Raise", category: "Bacak", target_muscle: "Gastrocnemius" },
  { name: "Skull Crusher", category: "Kol", target_muscle: "Triceps" },
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
  protein?: number;
  carbs?: number;
  fats?: number;
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
  onDetail: (item: LibraryItem) => void;
}

function LibraryItemCard({ item, onAdd, isAdded, onDetail }: LibraryItemCardProps) {
  return (
    <div
      className={cn(
        "glass rounded-lg p-3 transition-all border border-border group",
        isAdded 
          ? "opacity-50 bg-muted/30" 
          : "glass-hover cursor-pointer hover:border-primary/50"
      )}
      onClick={() => onDetail(item)}
    >
      <div className="flex items-center gap-3">
        {item.type === "exercise" ? (
          <Dumbbell className="w-4 h-4 text-primary/60 shrink-0" />
        ) : (
          <div className="relative shrink-0">
            <Apple className="w-4 h-4 text-success/60" />
            {item.type === "nutrition" && !item.id.startsWith("api-") && !item.id.startsWith("nut-") && (
              <CheckCircle2 className="w-2.5 h-2.5 text-success absolute -top-1 -right-1" />
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground">{item.category}</p>
            {item.muscleGroup && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary/70">
                {item.muscleGroup}
              </Badge>
            )}
            {item.kcal !== undefined && (
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-5 bg-warning/20 text-warning border-warning/30 font-medium">
                {item.kcal} kcal
              </Badge>
            )}
          </div>
          {item.protein !== undefined && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-5 bg-blue-500/20 text-blue-400 border-blue-500/30 font-medium">
                P: {item.protein}g
              </Badge>
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-5 bg-success/20 text-success border-success/30 font-medium">
                C: {item.carbs}g
              </Badge>
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-5 bg-purple-500/20 text-purple-400 border-purple-500/30 font-medium">
                F: {item.fats}g
              </Badge>
            </div>
          )}
        </div>
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

// --- Exercise Detail Modal ---
function ExerciseDetailModal({ item, open, onClose }: { item: LibraryItem | null; open: boolean; onClose: () => void }) {
  if (!item) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="w-5 h-5 text-primary" />
            {item.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {item.gifUrl ? (
            <div className="rounded-xl border border-border overflow-hidden bg-background/50 flex items-center justify-center">
              <img
                src={item.gifUrl}
                alt={item.name}
                className="w-full max-h-[360px] object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/30 flex flex-col items-center justify-center py-12">
              <Dumbbell className="w-12 h-12 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Görsel mevcut değil</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs border-primary/30 text-primary/80">
              {item.category}
            </Badge>
            {item.muscleGroup && (
              <Badge variant="outline" className="text-xs border-primary/30 text-primary/80">
                {item.muscleGroup}
              </Badge>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ProgramLibraryProps {
  onAddItem: (item: LibraryItem) => void;
  addedItemIds: string[];
  builderMode: "exercise" | "nutrition" | "supplement";
  onLoadTemplate: (template: SavedTemplate) => void;
}

export function ProgramLibrary({ 
  onAddItem, 
  addedItemIds, 
  builderMode,
  onLoadTemplate
}: ProgramLibraryProps) {
  const { user, activeCoachId } = useAuth();
  const { canCreatePrograms, canDeleteAthletes } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"items" | "templates">("items");
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Paginated exercises state
  const [exercises, setExercises] = useState<LibraryItem[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Nutrition API search state
  const [nutritionResults, setNutritionResults] = useState<LibraryItem[]>([]);
  const [loadingNutrition, setLoadingNutrition] = useState(false);

  // Coach's food library from DB
  const [coachFoods, setCoachFoods] = useState<LibraryItem[]>([]);
  const [loadingCoachFoods, setLoadingCoachFoods] = useState(false);

  // Supplement library state
  const [supplementItems, setSupplementItems] = useState<LibraryItem[]>([]);
  const [loadingSupplements, setLoadingSupplements] = useState(false);

  // Category list (fetched once)
  const [exerciseCategories, setExerciseCategories] = useState<string[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  // Detail modal
  const [detailItem, setDetailItem] = useState<LibraryItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchTerm]);

  // Fetch categories once
  useEffect(() => {
    if (categoriesLoaded) return;
    (async () => {
      const { data } = await supabase
        .from("exercise_library")
        .select("category")
        .not("category", "is", null);
      if (data) {
        const cats = Array.from(new Set(data.map((r: any) => r.category as string).filter(Boolean))).sort();
        setExerciseCategories(cats);
        setCategoriesLoaded(true);
      }
    })();
  }, [categoriesLoaded]);

  // Fetch exercises with pagination + server-side search
  const fetchPage = useCallback(async (reset: boolean) => {
    if (reset) {
      setLoadingExercises(true);
    } else {
      setLoadingMore(true);
    }

    const from = reset ? 0 : offset;

    let query = supabase
      .from("exercise_library")
      .select("*")
      .order("name")
      .range(from, from + PAGE_SIZE - 1);

    if (debouncedSearch.trim()) {
      query = query.ilike("name", `%${debouncedSearch.trim()}%`);
    }

    if (selectedCategory !== "all") {
      query = query.ilike("category", selectedCategory);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Exercise fetch error:", error);
      toast.error("Egzersiz yüklenemedi");
      setLoadingExercises(false);
      setLoadingMore(false);
      return;
    }

    const mapped = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      category: row.category || "Diğer",
      type: "exercise" as const,
      muscleGroup: row.target_muscle || undefined,
      gifUrl: row.video_url || undefined,
    }));

    if (reset) {
      setExercises(mapped);
      setOffset(PAGE_SIZE);
    } else {
      setExercises(prev => [...prev, ...mapped]);
      setOffset(from + PAGE_SIZE);
    }

    setHasMore(mapped.length === PAGE_SIZE);
    setLoadingExercises(false);
    setLoadingMore(false);
  }, [debouncedSearch, selectedCategory, offset]);

  // Reset and fetch when search or category changes
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    fetchPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedCategory]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loadingMore || !hasMore || builderMode !== "exercise") return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      fetchPage(false);
    }
  }, [loadingMore, hasMore, builderMode, fetchPage]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // For ExerciseLibraryEditor - full fetch for editor only
  const [allExercisesForEditor, setAllExercisesForEditor] = useState<LibraryItem[]>([]);
  const fetchAllForEditor = useCallback(async () => {
    const PAGE = 1000;
    let all: any[] = [];
    let from = 0;
    let more = true;
    while (more) {
      const { data } = await supabase.from("exercise_library").select("*").order("name").range(from, from + PAGE - 1);
      if (data && data.length > 0) {
        all = all.concat(data);
        from += PAGE;
        more = data.length === PAGE;
      } else {
        more = false;
      }
    }
    setAllExercisesForEditor(all.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category || "Diğer",
      type: "exercise",
      muscleGroup: row.target_muscle || undefined,
      gifUrl: row.video_url || undefined,
    })));
  }, []);

  const handleEditorRefresh = useCallback(() => {
    fetchAllForEditor();
    // Also reset paginated view
    setOffset(0);
    setHasMore(true);
    fetchPage(true);
    setCategoriesLoaded(false);
  }, [fetchAllForEditor]);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    if (!user || !activeCoachId) return;
    setLoadingTemplates(true);
    const { data, error } = await supabase
      .from("workout_templates")
      .select("*")
      .eq("coach_id", activeCoachId)
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
  }, [user, activeCoachId]);

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

  // Nutrition API search when in nutrition mode
  useEffect(() => {
    if (builderMode !== "nutrition") return;
    if (debouncedSearch.length < 2) {
      setNutritionResults([]);
      return;
    }
    let cancelled = false;
    setLoadingNutrition(true);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("search-food", {
          body: { query: debouncedSearch },
        });
        if (cancelled) return;
        if (error) throw error;
        const items: any[] = Array.isArray(data) ? data : data?.items || [];
        setNutritionResults(
          items.slice(0, 20).map((item: any, i: number) => ({
            id: `api-${Date.now()}-${i}`,
            name: item.name || item.food_name || "",
            category: item.brand || "API",
            type: "nutrition",
            kcal: Math.round(item.calories || 0),
            protein: Math.round(item.protein || 0),
            carbs: Math.round(item.carbs || 0),
            fats: Math.round(item.fat || 0),
          }))
        );
      } catch {
        if (!cancelled) setNutritionResults([]);
      } finally {
        if (!cancelled) setLoadingNutrition(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedSearch, builderMode]);

  // Fetch coach's food library from DB
  const fetchCoachFoods = useCallback(async () => {
    if (!user || !activeCoachId) return;
    setLoadingCoachFoods(true);
    const { data } = await supabase
      .from("food_items")
      .select("*")
      .eq("coach_id", activeCoachId)
      .order("name");
    if (data) {
      setCoachFoods(data.map((r: any) => ({
        id: r.id,
        name: r.name,
        category: r.category || "Genel",
        type: "nutrition",
        kcal: r.calories || 0,
        protein: r.protein || 0,
        carbs: r.carbs || 0,
        fats: r.fat || 0,
      })));
    }
    setLoadingCoachFoods(false);
  }, [user, activeCoachId]);

  useEffect(() => {
    if (builderMode === "nutrition") {
      fetchCoachFoods();
    }
  }, [builderMode, fetchCoachFoods]);

  // Fetch supplement library
  const fetchSupplementLibrary = useCallback(async () => {
    setLoadingSupplements(true);
    let query = supabase
      .from("supplements_library")
      .select("id, name, category, default_dosage, description, icon")
      .order("name");

    if (debouncedSearch.trim()) {
      query = query.ilike("name", `%${debouncedSearch.trim()}%`);
    }

    const { data } = await query;
    setSupplementItems((data ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      category: r.category || "Genel",
      type: "supplement",
      default_dosage: r.default_dosage,
      icon: r.icon || "💊",
    } as LibraryItem & { default_dosage?: string; icon?: string })));
    setLoadingSupplements(false);
  }, [debouncedSearch]);

  useEffect(() => {
    if (builderMode === "supplement") {
      fetchSupplementLibrary();
    }
  }, [builderMode, fetchSupplementLibrary]);

  // Auto-sync API food to food_items on add
  const handleAddWithSync = useCallback(async (item: LibraryItem) => {
    // Call original onAddItem immediately
    onAddItem(item);

    // If it's a nutrition item from API, upsert to food_items
    if (item.type === "nutrition" && item.id.startsWith("api-") && user) {
      try {
        const { data } = await supabase
          .from("food_items")
          .upsert({
            name: item.name,
            category: item.category === "API" ? "Genel" : item.category,
            calories: item.kcal || 0,
            protein: item.protein || 0,
            carbs: item.carbs || 0,
            fat: item.fats || 0,
            serving_size: "100g",
            coach_id: activeCoachId!,
          }, { onConflict: "name,coach_id" })
          .select("id")
          .single();

        if (data) {
          toast.success("Besin kütüphaneye eklendi");
          // Refresh coach foods list
          fetchCoachFoods();
        }
      } catch {
        // Non-blocking, ignore errors
      }
    }
  }, [onAddItem, user, fetchCoachFoods]);

  const filteredNutrition = debouncedSearch.length >= 2
    ? nutritionResults
    : coachFoods.length > 0
      ? coachFoods.filter(
          (f) =>
            f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.category.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : nutrition.filter(
          (nut) =>
            nut.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            nut.category.toLowerCase().includes(searchTerm.toLowerCase())
        );

  const filteredTemplates = templates.filter(
    (t) => t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentItems = builderMode === "exercise" ? exercises : builderMode === "supplement" ? supplementItems : filteredNutrition;

  return (
    <div className="glass rounded-xl border border-border h-full flex flex-col">
      {/* Detail Modal */}
      <ExerciseDetailModal item={detailItem} open={detailOpen} onClose={() => { setDetailOpen(false); setDetailItem(null); }} />

      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Kütüphane</h2>
          {builderMode === "exercise" && canCreatePrograms && (
            <ExerciseLibraryEditor exercises={allExercisesForEditor} onRefresh={handleEditorRefresh} onOpen={fetchAllForEditor} />
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

        {/* Category Filter */}
        {builderMode === "exercise" && (
          <div className="flex gap-1.5 flex-wrap mt-2.5">
            <button
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border",
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              Tümü
            </button>
            {exerciseCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? "all" : cat)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border",
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "items" | "templates")} className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-3">
          <TabsList className="w-full bg-muted/50">
            <TabsTrigger value="items" className="flex-1 text-xs">
              {builderMode === "exercise" ? (
                <>
                  <Dumbbell className="w-3 h-3 mr-1.5" />
                  Egzersizler ({TOTAL_EXERCISE_COUNT})
                </>
              ) : builderMode === "supplement" ? (
                <>
                  <Pill className="w-3 h-3 mr-1.5" />
                  Takviyeler ({supplementItems.length})
                </>
              ) : (
                <>
                  <Apple className="w-3 h-3 mr-1.5" />
                  Besinler ({filteredNutrition.length})
                </>
              )}
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex-1 text-xs">
              <BookMarked className="w-3 h-3 mr-1.5" />
              Şablonlarım ({templates.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0">
          <TabsContent value="items" className="mt-0 h-full">
            <div
              ref={scrollRef}
              className="h-full overflow-y-auto scrollbar-hide px-4 py-3 space-y-2"
            >
              {(loadingExercises && builderMode === "exercise") || ((loadingNutrition || loadingCoachFoods) && builderMode === "nutrition") || (loadingSupplements && builderMode === "supplement") ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {builderMode === "supplement" ? (
                    currentItems.map((item: any) => (
                      <div
                        key={item.id}
                        className="glass rounded-lg p-3 transition-all border border-border group glass-hover cursor-pointer hover:border-purple-500/30"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg shrink-0">{item.icon || "💊"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-muted-foreground">{item.category}</p>
                              {item.default_dosage && (
                                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-5 bg-purple-500/20 text-purple-400 border-purple-500/30 font-medium">
                                  {item.default_dosage}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-all hover:bg-purple-500 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddWithSync(item);
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    currentItems.map((item) => (
                      <LibraryItemCard
                        key={item.id}
                        item={item}
                        onAdd={handleAddWithSync}
                        isAdded={addedItemIds.includes(item.id)}
                        onDetail={(it) => { setDetailItem(it); setDetailOpen(true); }}
                      />
                    ))
                  )}
                  {loadingMore && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {currentItems.length === 0 && !loadingExercises && !loadingNutrition && !loadingCoachFoods && !loadingSupplements && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {builderMode === "exercise" ? "Egzersiz bulunamadı" : 
                       builderMode === "supplement" ? "Takviye bulunamadı" :
                       debouncedSearch.length >= 2 ? "Besin bulunamadı" : coachFoods.length === 0 ? "Besin aramak için en az 2 karakter yazın" : "Sonuç bulunamadı"}
                    </p>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="templates" className="mt-0 h-full">
            <ScrollArea className="h-full px-4 py-3">
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
                <div className="space-y-2">
                  {filteredTemplates.map((template) => (
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
                          {canDeleteAthletes && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => handleDeleteTemplate(e, template.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
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
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>

      {/* Quick Stats */}
      <div className="p-4 border-t border-border bg-muted/20">
        <p className="text-xs text-muted-foreground text-center">
          {builderMode === "exercise" 
            ? `Toplam: ${TOTAL_EXERCISE_COUNT} egzersiz`
            : coachFoods.length > 0 ? `Kütüphanem: ${coachFoods.length} besin` : `Toplam: ${nutrition.length} besin`
          }
        </p>
      </div>
    </div>
  );
}

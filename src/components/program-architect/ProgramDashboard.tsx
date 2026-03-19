import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Dumbbell,
  Apple,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Users,
  Calendar,
  Loader2,
  Save,
  Layers,
  Flame,
  Download,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { AssignProgramDialog } from "./AssignProgramDialog";
import { BulkAssignDialog } from "./BulkAssignDialog";
import { AssignDietTemplateBulkDialog } from "./AssignDietTemplateBulkDialog";

export interface ProgramData {
  id: string;
  name: string;
  type: "exercise" | "nutrition";
  description: string;
  duration: string;
  assignedCount: number;
  createdAt: Date;
  blockType?: "hypertrophy" | "strength" | "endurance";
  difficulty?: string;
  targetGoal?: string;
  targetCalories?: number;
  foodCount?: number;
}

interface ProgramDashboardProps {
  onCreateProgram: (type: "exercise" | "nutrition") => void;
  onEditProgram: (program: ProgramData) => void;
  onSaveAsTemplate?: (program: ProgramData) => void;
}

export function ProgramDashboard({ onCreateProgram, onEditProgram, onSaveAsTemplate }: ProgramDashboardProps) {
  const { user, activeCoachId } = useAuth();
  const { canCreatePrograms, canAssignPrograms, canEditAthletes, canDeleteAthletes } = usePermissions();
  const importRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<"exercise" | "nutrition">("exercise");
  const [programs, setPrograms] = useState<ProgramData[]>([]);
  const [dietTemplates, setDietTemplates] = useState<ProgramData[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; program: ProgramData | null }>({
    open: false,
    program: null,
  });
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; program: ProgramData | null }>({
    open: false,
    program: null,
  });
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [dietAssignDialog, setDietAssignDialog] = useState<{ open: boolean; templateId: string; templateName: string }>({
    open: false, templateId: "", templateName: "",
  });

  const fetchPrograms = useCallback(async () => {
    if (!user || !activeCoachId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("programs")
      .select("*")
      .eq("coach_id", activeCoachId)
      .eq("is_template", true)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Programlar yüklenemedi");
      setLoading(false);
      return;
    }

    const mapped: ProgramData[] = (data ?? []).map((p) => ({
      id: p.id,
      name: p.title,
      type: "exercise" as const,
      description: p.description ?? "",
      duration: "",
      assignedCount: 0,
      createdAt: new Date(p.created_at ?? Date.now()),
      difficulty: p.difficulty ?? undefined,
      targetGoal: p.target_goal ?? undefined,
      blockType: p.target_goal === "hypertrophy"
        ? "hypertrophy"
        : p.target_goal === "strength"
          ? "strength"
          : p.target_goal === "endurance"
            ? "endurance"
            : undefined,
    }));
    setPrograms(mapped);
    setLoading(false);
  }, [user, activeCoachId]);

  const fetchDietTemplates = useCallback(async () => {
    if (!user || !activeCoachId) return;
    setLoading(true);

    const { data: tpls, error } = await supabase
      .from("diet_templates")
      .select("id, title, description, target_calories, created_at")
      .eq("coach_id", activeCoachId)
      .eq("is_template", true)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Beslenme şablonları yüklenemedi");
      setLoading(false);
      return;
    }

    if (!tpls?.length) {
      setDietTemplates([]);
      setLoading(false);
      return;
    }

    // Get food counts per template
    const { data: foods } = await supabase
      .from("diet_template_foods")
      .select("template_id")
      .in("template_id", tpls.map((t) => t.id));

    const foodCountMap: Record<string, number> = {};
    (foods || []).forEach((f) => {
      foodCountMap[f.template_id] = (foodCountMap[f.template_id] || 0) + 1;
    });

    const mapped: ProgramData[] = tpls.map((t) => ({
      id: t.id,
      name: t.title,
      type: "nutrition" as const,
      description: t.description ?? "",
      duration: "",
      assignedCount: 0,
      createdAt: new Date(t.created_at ?? Date.now()),
      targetCalories: t.target_calories ?? undefined,
      foodCount: foodCountMap[t.id] || 0,
    }));

    setDietTemplates(mapped);
    setLoading(false);
  }, [user, activeCoachId]);

  useEffect(() => {
    if (viewMode === "exercise") {
      fetchPrograms();
    } else {
      fetchDietTemplates();
    }
  }, [viewMode, fetchPrograms, fetchDietTemplates]);

  const currentItems = viewMode === "exercise" ? programs : dietTemplates;

  const handleDelete = (program: ProgramData) => {
    setDeleteDialog({ open: true, program });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.program) return;
    const item = deleteDialog.program;

    if (item.type === "nutrition") {
      // Delete foods first, then template
      await supabase.from("diet_template_foods").delete().eq("template_id", item.id);
      const { error } = await supabase.from("diet_templates").delete().eq("id", item.id);
      if (error) {
        toast.error("Şablon silinemedi");
      } else {
        toast.success(`"${item.name}" silindi`);
        setDietTemplates((prev) => prev.filter((p) => p.id !== item.id));
      }
    } else {
      // Delete exercises first, then program
      await supabase.from("exercises").delete().eq("program_id", item.id);
      const { error } = await supabase.from("programs").delete().eq("id", item.id);
      if (error) {
        toast.error("Program silinemedi");
      } else {
        toast.success(`"${item.name}" silindi`);
        setPrograms((prev) => prev.filter((p) => p.id !== item.id));
      }
    }
    setDeleteDialog({ open: false, program: null });
  };

  const handleDuplicateDiet = async (item: ProgramData, openInEditor = false) => {
    if (!user || !activeCoachId) return;
    const { data: tpl } = await supabase.from("diet_templates").select("*").eq("id", item.id).single();
    if (!tpl) { toast.error("Şablon bulunamadı"); return; }

    const { data: newTpl, error } = await supabase
      .from("diet_templates")
      .insert({ title: `${tpl.title} (Kopya)`, description: tpl.description, target_calories: tpl.target_calories, coach_id: activeCoachId })
      .select().single();
    if (error || !newTpl) { toast.error("Kopyalama başarısız"); return; }

    const { data: foods } = await supabase.from("diet_template_foods").select("*").eq("template_id", item.id);
    if (foods && foods.length > 0) {
      await supabase.from("diet_template_foods").insert(
        foods.map((f) => ({ template_id: newTpl.id, food_name: f.food_name, meal_type: f.meal_type, day_number: f.day_number, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, serving_size: f.serving_size }))
      );
    }
    toast.success(`"${item.name}" kopyalandı`);

    if (openInEditor) {
      const cloned: ProgramData = { ...item, id: newTpl.id, name: newTpl.title, createdAt: new Date(newTpl.created_at ?? Date.now()) };
      onEditProgram(cloned);
    } else {
      fetchDietTemplates();
    }
  };

  const handleDuplicate = async (program: ProgramData, openInEditor = false) => {
    if (!user || !activeCoachId) return;

    // Fetch full program data + exercises in parallel
    const [{ data: progData }, { data: exercises }] = await Promise.all([
      supabase.from("programs").select("week_config, automation_rules").eq("id", program.id).single(),
      supabase.from("exercises").select("*").eq("program_id", program.id),
    ]);

    // Insert cloned program with all metadata
    const { data: newProg, error: progErr } = await supabase
      .from("programs")
      .insert({
        title: `${program.name} (Kopya)`,
        description: program.description,
        difficulty: program.difficulty,
        target_goal: program.targetGoal,
        coach_id: activeCoachId,
        week_config: progData?.week_config ?? ([] as any),
        automation_rules: progData?.automation_rules ?? ([] as any),
      })
      .select()
      .single();

    if (progErr || !newProg) {
      toast.error("Program kopyalanamadı");
      return;
    }

    // Copy exercises with all fields (rir, failure_set included)
    if (exercises && exercises.length > 0) {
      const { error: exErr } = await supabase.from("exercises").insert(
        exercises.map((ex) => ({
          program_id: newProg.id,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          rest_time: ex.rest_time,
          notes: ex.notes,
          order_index: ex.order_index,
          video_url: ex.video_url,
          rir: (ex as any).rir ?? 2,
          failure_set: (ex as any).failure_set ?? false,
        }))
      );
      if (exErr) {
        toast.error("Egzersizler kopyalanamadı");
        await supabase.from("programs").delete().eq("id", newProg.id);
        return;
      }
    }

    toast.success(`"${program.name}" kopyalandı`);

    if (openInEditor) {
      const clonedProgram: ProgramData = {
        ...program,
        id: newProg.id,
        name: newProg.title,
        createdAt: new Date(newProg.created_at ?? Date.now()),
      };
      onEditProgram(clonedProgram);
    } else {
      fetchPrograms();
    }
  };

  const getBlockColor = (type?: string) => {
    switch (type) {
      case "hypertrophy":
        return "bg-primary/20 text-primary border-primary/30";
      case "strength":
        return "bg-warning/20 text-warning border-warning/30";
      case "endurance":
        return "bg-info/20 text-info border-info/30";
      default:
        return "bg-success/20 text-success border-success/30";
    }
  };

  const handleExportProgram = async (item: ProgramData) => {
    try {
      if (item.type === "exercise") {
        const [{ data: prog }, { data: exercises }] = await Promise.all([
          supabase.from("programs").select("week_config, automation_rules, difficulty, target_goal, description").eq("id", item.id).single(),
          supabase.from("exercises").select("name, sets, reps, rir, failure_set, notes, order_index, video_url, rest_time, rir_per_set").eq("program_id", item.id),
        ]);

        // Resolve exercise_library IDs by name
        const exerciseNames = (exercises ?? []).map(e => e.name);
        const { data: libMatches } = exerciseNames.length > 0
          ? await supabase.from("exercise_library").select("id, name").in("name", exerciseNames)
          : { data: [] };
        const nameToLibId = new Map((libMatches ?? []).map(r => [r.name, r.id]));

        const json = {
          name: item.name,
          type: "exercise",
          format_version: 2,
          description: prog?.description ?? item.description,
          difficulty: prog?.difficulty ?? item.difficulty,
          targetGoal: prog?.target_goal ?? item.targetGoal,
          weekConfig: prog?.week_config ?? [],
          automationRules: prog?.automation_rules ?? [],
          exercises: (exercises ?? []).map((e) => ({
            library_id: nameToLibId.get(e.name) ?? null,
            name: e.name,
            sets: e.sets, reps: e.reps, rir: e.rir,
            failure_set: e.failure_set, notes: e.notes, order_index: e.order_index,
            rest_time: e.rest_time, rir_per_set: e.rir_per_set,
          })),
        };
        triggerDownload(json, item.name);
      } else {
        const { data: foods } = await supabase.from("diet_template_foods").select("*").eq("template_id", item.id);

        // Resolve food_items IDs by name + coach_id
        const foodNames = (foods ?? []).map(f => f.food_name);
        const { data: foodMatches } = foodNames.length > 0
          ? await supabase.from("food_items").select("id, name").in("name", foodNames)
          : { data: [] };
        const nameToFoodId = new Map((foodMatches ?? []).map(r => [r.name, r.id]));

        const json = {
          name: item.name,
          type: "nutrition",
          format_version: 2,
          description: item.description,
          targetCalories: item.targetCalories,
          foods: (foods ?? []).map((f) => ({
            food_item_id: nameToFoodId.get(f.food_name) ?? null,
            food_name: f.food_name, meal_type: f.meal_type, day_number: f.day_number,
            calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat,
            serving_size: f.serving_size,
          })),
        };
        triggerDownload(json, item.name);
      }
      toast.success("Program dışa aktarıldı");
    } catch {
      toast.error("Dışa aktarma başarısız");
    }
  };

  const triggerDownload = (data: object, name: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, "-")}-template.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportProgram = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeCoachId) return;
    e.target.value = "";

    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.name || !data.type) {
        toast.error("Geçersiz dosya formatı");
        setImporting(false);
        return;
      }

      if (data.type === "exercise") {
        const { data: newProg, error } = await supabase.from("programs").insert({
          title: data.name,
          description: data.description ?? "",
          difficulty: data.difficulty ?? null,
          target_goal: data.targetGoal ?? null,
          coach_id: activeCoachId,
          week_config: data.weekConfig ?? ([] as any),
          automation_rules: data.automationRules ?? ([] as any),
        }).select().single();

        if (error || !newProg) { toast.error("Program oluşturulamadı"); setImporting(false); return; }

        if (data.exercises?.length > 0) {
          // Collect library_ids from JSON to fetch video_url from exercise_library
          const libIds = (data.exercises as any[]).map(ex => ex.library_id).filter(Boolean);
          let libMap = new Map<string, { name: string; video_url: string | null }>();

          if (libIds.length > 0) {
            const { data: libRows } = await supabase
              .from("exercise_library")
              .select("id, name, video_url")
              .in("id", libIds);
            libMap = new Map((libRows ?? []).map(r => [r.id, { name: r.name, video_url: r.video_url }]));
          }

          await supabase.from("exercises").insert(
            (data.exercises as any[]).map((ex: any) => {
              const lib = ex.library_id ? libMap.get(ex.library_id) : null;
              return {
                program_id: newProg.id,
                name: lib?.name ?? ex.name,
                sets: ex.sets ?? 3,
                reps: ex.reps ?? null,
                rir: ex.rir ?? 2,
                failure_set: ex.failure_set ?? false,
                notes: ex.notes ?? null,
                order_index: ex.order_index ?? 0,
                video_url: lib?.video_url ?? ex.video_url ?? null,
                rest_time: ex.rest_time ?? null,
                rir_per_set: ex.rir_per_set ?? null,
              };
            })
          );
        }
        toast.success(`"${data.name}" başarıyla içe aktarıldı!`);
        fetchPrograms();

      } else if (data.type === "nutrition") {
        const { data: newTpl, error } = await supabase.from("diet_templates").insert({
          title: data.name,
          description: data.description ?? "",
          target_calories: data.targetCalories ?? null,
          coach_id: activeCoachId,
        }).select().single();

        if (error || !newTpl) { toast.error("Şablon oluşturulamadı"); setImporting(false); return; }

        if (data.foods?.length > 0) {
          // Collect food_item_ids from JSON to fetch macro data from food_items
          const foodIds = (data.foods as any[]).map(f => f.food_item_id).filter(Boolean);
          let foodMap = new Map<string, any>();

          if (foodIds.length > 0) {
            const { data: foodRows } = await supabase
              .from("food_items")
              .select("id, name, calories, protein, carbs, fat, serving_size")
              .in("id", foodIds);
            foodMap = new Map((foodRows ?? []).map(r => [r.id, r]));
          }

          await supabase.from("diet_template_foods").insert(
            (data.foods as any[]).map((f: any) => {
              const dbFood = f.food_item_id ? foodMap.get(f.food_item_id) : null;
              return {
                template_id: newTpl.id,
                food_name: dbFood?.name ?? f.food_name,
                meal_type: f.meal_type ?? "snack",
                day_number: f.day_number ?? 1,
                calories: dbFood?.calories ?? f.calories ?? 0,
                protein: dbFood?.protein ?? f.protein ?? 0,
                carbs: dbFood?.carbs ?? f.carbs ?? 0,
                fat: dbFood?.fat ?? f.fat ?? 0,
                serving_size: dbFood?.serving_size ?? f.serving_size ?? null,
              };
            })
          );
        }
        toast.success(`"${data.name}" başarıyla içe aktarıldı!`);
        fetchDietTemplates();
      } else {
        toast.error("Bilinmeyen program tipi");
      }
    } catch {
      toast.error("Dosya okunamadı veya geçersiz JSON");
    }
    setImporting(false);
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for import */}
      <input
        ref={importRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportProgram}
      />
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Program Mimarı</h1>
          <p className="text-muted-foreground mt-1">
            Antrenman ve beslenme programlarını görüntüle, düzenle ve yönet
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="glass rounded-lg px-4 py-2 border border-border flex items-center gap-3">
            <div
              className={`flex items-center gap-2 cursor-pointer ${viewMode === "exercise" ? "text-primary" : "text-muted-foreground"}`}
              onClick={() => setViewMode("exercise")}
            >
              <Dumbbell className="w-4 h-4" />
              <Label className="text-sm font-medium cursor-pointer">Antrenman</Label>
            </div>
            <Switch
              checked={viewMode === "nutrition"}
              onCheckedChange={(checked) => setViewMode(checked ? "nutrition" : "exercise")}
            />
            <div
              className={`flex items-center gap-2 cursor-pointer ${viewMode === "nutrition" ? "text-success" : "text-muted-foreground"}`}
              onClick={() => setViewMode("nutrition")}
            >
              <Apple className="w-4 h-4" />
              <Label className="text-sm font-medium cursor-pointer">Beslenme</Label>
            </div>
          </div>

          {viewMode === "exercise" && canAssignPrograms && (
            <Button
              variant="outline"
              onClick={() => setBulkAssignOpen(true)}
              className="border-border"
            >
              <Layers className="w-4 h-4 mr-1.5" />
              Toplu Ata
            </Button>
          )}

          {canCreatePrograms && (
            <Button
              variant="outline"
              onClick={() => importRef.current?.click()}
              disabled={importing}
              className="border-border"
            >
              {importing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
              İçe Aktar
            </Button>
          )}

          {canCreatePrograms && (
            <Button
              onClick={() => onCreateProgram(viewMode)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 glow-lime"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {viewMode === "exercise" ? "Program Oluştur" : "Beslenme Şablonu Oluştur"}
            </Button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Items Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentItems.map((item) => (
            <Card
              key={item.id}
              className="glass border-border group hover:border-primary/50 transition-all cursor-pointer"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        item.type === "exercise" ? "bg-primary/20" : "bg-success/20"
                      )}
                    >
                      {item.type === "exercise" ? (
                        <Dumbbell className="w-5 h-5 text-primary" />
                      ) : (
                        <Apple className="w-5 h-5 text-success" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">{item.name}</CardTitle>
                      {item.type === "exercise" && item.blockType && (
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] mt-1", getBlockColor(item.blockType))}
                        >
                          {item.blockType === "hypertrophy"
                            ? "Hipertrofi"
                            : item.blockType === "strength"
                              ? "Güç"
                              : "Dayanıklılık"}
                        </Badge>
                      )}
                      {item.type === "nutrition" && (
                        <div className="flex items-center gap-2 mt-1">
                          {item.targetCalories && (
                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                              <Flame className="w-3 h-3 mr-0.5" />
                              {item.targetCalories} kcal
                            </Badge>
                          )}
                          {item.foodCount !== undefined && item.foodCount > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              {item.foodCount} besin
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border">
                      {item.type === "exercise" && (
                        <>
                          {canEditAthletes && (
                            <DropdownMenuItem onClick={() => onEditProgram(item)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Düzenle
                            </DropdownMenuItem>
                          )}
                          {canAssignPrograms && (
                            <DropdownMenuItem onClick={() => setAssignDialog({ open: true, program: item })}>
                              <Users className="w-4 h-4 mr-2" />
                              Sporculara Ata
                            </DropdownMenuItem>
                          )}
                          {canCreatePrograms && (
                            <>
                              <DropdownMenuItem onClick={() => handleDuplicate(item, false)}>
                                <Copy className="w-4 h-4 mr-2" />
                                Kopyala
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(item, true)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Klonla &amp; Düzenle
                              </DropdownMenuItem>
                            </>
                          )}
                          {onSaveAsTemplate && canCreatePrograms && (
                            <DropdownMenuItem onClick={() => onSaveAsTemplate(item)}>
                              <Save className="w-4 h-4 mr-2" />
                              Şablon Olarak Kaydet
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleExportProgram(item)}>
                            <Download className="w-4 h-4 mr-2" />
                            Dışa Aktar
                          </DropdownMenuItem>
                        </>
                      )}
                      {item.type === "nutrition" && (
                        <>
                          {canEditAthletes && (
                            <DropdownMenuItem onClick={() => onEditProgram(item)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Düzenle
                            </DropdownMenuItem>
                          )}
                          {canAssignPrograms && (
                            <DropdownMenuItem onClick={() => setDietAssignDialog({ open: true, templateId: item.id, templateName: item.name })}>
                              <Users className="w-4 h-4 mr-2" />
                              Sporculara Ata
                            </DropdownMenuItem>
                          )}
                          {canCreatePrograms && (
                            <>
                              <DropdownMenuItem onClick={() => handleDuplicateDiet(item, false)}>
                                <Copy className="w-4 h-4 mr-2" />
                                Kopyala
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicateDiet(item, true)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Klonla &amp; Düzenle
                              </DropdownMenuItem>
                            </>
                          )}
                          {onSaveAsTemplate && canCreatePrograms && (
                            <DropdownMenuItem onClick={() => onSaveAsTemplate(item)}>
                              <Save className="w-4 h-4 mr-2" />
                              Şablon Olarak Kaydet
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleExportProgram(item)}>
                            <Download className="w-4 h-4 mr-2" />
                            Dışa Aktar
                          </DropdownMenuItem>
                        </>
                      )}
                      {canDeleteAthletes && (
                        <DropdownMenuItem
                          onClick={() => handleDelete(item)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Sil
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {item.description || (item.type === "nutrition" ? "Beslenme şablonu" : "")}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {item.createdAt.toLocaleDateString("tr-TR")}
                  </div>
                  {item.type === "exercise" && item.difficulty && (
                    <Badge variant="outline" className="text-[10px]">
                      {item.difficulty === "beginner" ? "Başlangıç" : item.difficulty === "intermediate" ? "Orta" : "İleri"}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {currentItems.length === 0 && (
            <div className="col-span-full glass rounded-xl border border-border p-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                {viewMode === "exercise" ? (
                  <Dumbbell className="w-8 h-8 text-muted-foreground" />
                ) : (
                  <Apple className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Henüz {viewMode === "exercise" ? "antrenman programı" : "beslenme şablonu"} yok
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                İlk {viewMode === "exercise" ? "programınızı" : "şablonunuzu"} oluşturmak için aşağıdaki butona tıklayın
              </p>
              <Button onClick={() => onCreateProgram(viewMode)}>
                <Plus className="w-4 h-4 mr-1.5" />
                {viewMode === "exercise" ? "Program Oluştur" : "Şablon Oluştur"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, program: null })}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{deleteDialog.program?.type === "nutrition" ? "Şablonu Sil" : "Programı Sil"}</DialogTitle>
            <DialogDescription>
              "{deleteDialog.program?.name}" {deleteDialog.program?.type === "nutrition" ? "şablonunu" : "programını"} silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, program: null })}>
              İptal
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Program Dialog */}
      {assignDialog.program && (
        <AssignProgramDialog
          open={assignDialog.open}
          onOpenChange={(open) => setAssignDialog({ open, program: open ? assignDialog.program : null })}
          programId={assignDialog.program.id}
          programName={assignDialog.program.name}
        />
      )}

      {/* Bulk Assign Dialog */}
      <BulkAssignDialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen} />

      {/* Diet Template Bulk Assign Dialog */}
      <AssignDietTemplateBulkDialog
        open={dietAssignDialog.open}
        onOpenChange={(open) => setDietAssignDialog((prev) => ({ ...prev, open }))}
        templateId={dietAssignDialog.templateId}
        templateName={dietAssignDialog.templateName}
      />
    </div>
  );
}

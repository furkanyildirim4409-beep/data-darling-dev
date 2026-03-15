import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dumbbell, Apple, Calendar, Clock, Target, MoreVertical, Trash2, LayoutGrid, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { AssignDietTemplateDialog } from "@/components/athlete-detail/AssignDietTemplateDialog";
import { AssignTrainingDialog } from "@/components/athlete-detail/AssignTrainingDialog";

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
  parentProgramId: string | null;
}

interface DietData {
  templateId: string;
  templateName: string;
  description: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  startDate: string | null;
  durationWeeks: number | null;
}

interface WorkoutDay {
  dayOfWeek: string;
  workoutName: string;
  exercises: { name: string; sets: number; reps: string; rir?: number }[];
}

interface DietDayFood {
  meal_type: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: string | null;
}

interface DietDay {
  dayNumber: number;
  foods: DietDayFood[];
}

const DAY_LABELS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const MEAL_LABELS: Record<string, string> = {
  breakfast: "Kahvaltı",
  lunch: "Öğle Yemeği",
  snack: "Ara Öğün",
  dinner: "Akşam Yemeği",
};

export function ActiveBlocks({ athleteId }: ActiveBlocksProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [trainings, setTrainings] = useState<TrainingData[]>([]);
  const [diets, setDiets] = useState<DietData[]>([]);

  // Detail dialog state
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [dietDialogOpen, setDietDialogOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<TrainingData | null>(null);
  const [selectedDiet, setSelectedDiet] = useState<DietData | null>(null);

  // Assign dialogs
  const [assignProgramOpen, setAssignProgramOpen] = useState(false);
  const [assignDietOpen, setAssignDietOpen] = useState(false);
  const [replacingTraining, setReplacingTraining] = useState<TrainingData | null>(null);
  const [replacingDiet, setReplacingDiet] = useState<DietData | null>(null);

  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([]);
  const [dietDays, setDietDays] = useState<DietDay[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    // Fetch all distinct programs from assigned_workouts
    const { data: workouts } = await supabase
      .from("assigned_workouts")
      .select("program_id, scheduled_date")
      .eq("athlete_id", athleteId)
      .not("program_id", "is", null)
      .order("scheduled_date", { ascending: true });

    const programMap = new Map<string, string[]>();
    (workouts || []).forEach((w) => {
      if (!w.program_id) return;
      if (!programMap.has(w.program_id)) programMap.set(w.program_id, []);
      if (w.scheduled_date) programMap.get(w.program_id)!.push(w.scheduled_date);
    });

    const programIds = Array.from(programMap.keys());
    let trainingList: TrainingData[] = [];
    if (programIds.length > 0) {
      const { data: programs } = await supabase
        .from("programs")
        .select("id, title, description, created_at, parent_program_id")
        .in("id", programIds);

      trainingList = (programs || []).map((p) => {
        const dates = (programMap.get(p.id) || []).sort();
        const startDate = dates[0] || p.created_at?.slice(0, 10) || null;
        const endDate = dates[dates.length - 1] || null;
        let totalDays = 56;
        let elapsedDays = 0;
        if (startDate && endDate) {
          totalDays = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
          elapsedDays = Math.max(0, Math.ceil((Date.now() - new Date(startDate).getTime()) / 86400000));
        } else if (startDate) {
          elapsedDays = Math.max(0, Math.ceil((Date.now() - new Date(startDate).getTime()) / 86400000));
        }
        return {
          programId: p.id,
          programName: p.title,
          description: p.description,
          startDate,
          totalDays,
          elapsedDays: Math.min(elapsedDays, totalDays),
          parentProgramId: p.parent_program_id ?? null,
        };
      });
    }
    setTrainings(trainingList);

    // Fetch diets: from nutrition_targets (primary) + athlete_diet_assignments
    const [ntRes, adaRes] = await Promise.all([
      supabase.from("nutrition_targets").select("active_diet_template_id, daily_calories, protein_g, carbs_g, fat_g, diet_start_date, diet_duration_weeks").eq("athlete_id", athleteId).maybeSingle(),
      supabase.from("athlete_diet_assignments").select("template_id").eq("athlete_id", athleteId),
    ]);

    const dietTemplateIds = new Set<string>();
    const primaryTemplateId = ntRes.data?.active_diet_template_id;
    if (primaryTemplateId) dietTemplateIds.add(primaryTemplateId);
    (adaRes.data || []).forEach((a) => dietTemplateIds.add(a.template_id));

    let dietList: DietData[] = [];
    if (dietTemplateIds.size > 0) {
      const { data: templates } = await supabase
        .from("diet_templates")
        .select("id, title, description, target_calories")
        .in("id", Array.from(dietTemplateIds));

      // Get macro totals from foods
      const { data: foods } = await supabase
        .from("diet_template_foods")
        .select("template_id, calories, protein, carbs, fat")
        .in("template_id", Array.from(dietTemplateIds));

      const ntData = ntRes.data as any;
      dietList = (templates || []).map((t) => {
        const tf = (foods || []).filter((f) => f.template_id === t.id);
        const dayCount = new Set(tf.map(() => 1)).size || 1;
        const totalCal = tf.reduce((s, f) => s + (f.calories || 0), 0);
        const totalP = tf.reduce((s, f) => s + (Number(f.protein) || 0), 0);
        const totalC = tf.reduce((s, f) => s + (Number(f.carbs) || 0), 0);
        const totalF = tf.reduce((s, f) => s + (Number(f.fat) || 0), 0);

        const isPrimary = t.id === primaryTemplateId;
        return {
          templateId: t.id,
          templateName: t.title,
          description: t.description,
          calories: isPrimary ? (ntRes.data?.daily_calories || totalCal) : totalCal,
          protein: isPrimary ? (ntRes.data?.protein_g || Math.round(totalP)) : Math.round(totalP),
          carbs: isPrimary ? (ntRes.data?.carbs_g || Math.round(totalC)) : Math.round(totalC),
          fat: isPrimary ? (ntRes.data?.fat_g || Math.round(totalF)) : Math.round(totalF),
          startDate: isPrimary ? (ntData?.diet_start_date || null) : null,
          durationWeeks: isPrimary ? (ntData?.diet_duration_weeks || null) : null,
        };
      });
    }
    setDiets(dietList);
    setIsLoading(false);
    setWorkoutDays([]);
    setDietDays([]);
  }, [athleteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRevokeTraining = async (t: TrainingData) => {
    if (!user) return;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    await supabase.from("assigned_workouts").delete().eq("athlete_id", athleteId).eq("program_id", t.programId).gte("scheduled_date", todayStr);

    // Clear active_program_id only if it matches
    const { data: profile } = await supabase.from("profiles").select("active_program_id").eq("id", athleteId).maybeSingle();
    if (profile?.active_program_id === t.programId) {
      await supabase.from("profiles").update({ active_program_id: null } as any).eq("id", athleteId);
    }

    await supabase.from("program_assignment_logs").insert({ athlete_id: athleteId, coach_id: user.id, program_id: t.programId, program_title: t.programName, action: "removed" });
    toast.success(`"${t.programName}" programı kaldırıldı`);
    fetchData();
  };

  const handleRevokeDiet = async (d: DietData) => {
    if (!user) return;
    // Remove from athlete_diet_assignments
    await supabase.from("athlete_diet_assignments").delete().eq("athlete_id", athleteId).eq("template_id", d.templateId);

    // Clear from nutrition_targets if it's the primary
    const { data: nt } = await supabase.from("nutrition_targets").select("active_diet_template_id").eq("athlete_id", athleteId).maybeSingle();
    if (nt?.active_diet_template_id === d.templateId) {
      await supabase.from("nutrition_targets").update({ active_diet_template_id: null, diet_start_date: null, diet_duration_weeks: null, updated_at: new Date().toISOString() } as any).eq("athlete_id", athleteId);
    }

    toast.success(`"${d.templateName}" beslenme planı kaldırıldı`);
    fetchData();
  };

  const openTrainingDialog = useCallback(async (t: TrainingData) => {
    setSelectedTraining(t);
    setTrainingDialogOpen(true);
    setWorkoutDays([]);
    setDetailLoading(true);
    const { data } = await supabase.from("assigned_workouts").select("day_of_week, workout_name, exercises").eq("athlete_id", athleteId).eq("program_id", t.programId);
    if (data) {
      const days: WorkoutDay[] = data.map((w: any) => ({
        dayOfWeek: w.day_of_week || "—",
        workoutName: w.workout_name || "Antrenman",
        exercises: Array.isArray(w.exercises) ? w.exercises.map((e: any) => ({ name: e.name || e.exerciseName || "—", sets: e.sets || 0, reps: e.reps || "—", rir: e.rir })) : [],
      })).sort((a, b) => DAY_LABELS.indexOf(a.dayOfWeek) - DAY_LABELS.indexOf(b.dayOfWeek));
      setWorkoutDays(days);
    }
    setDetailLoading(false);
  }, [athleteId]);

  const openDietDialog = useCallback(async (d: DietData) => {
    setSelectedDiet(d);
    setDietDialogOpen(true);
    setDietDays([]);
    setDetailLoading(true);
    const { data } = await supabase.from("diet_template_foods").select("day_number, meal_type, food_name, calories, protein, carbs, fat, serving_size").eq("template_id", d.templateId).order("day_number").order("meal_type");
    if (data) {
      const grouped: Record<number, DietDayFood[]> = {};
      data.forEach((f: any) => {
        const dn = f.day_number || 1;
        if (!grouped[dn]) grouped[dn] = [];
        grouped[dn].push({ meal_type: f.meal_type, food_name: f.food_name, calories: f.calories || 0, protein: f.protein || 0, carbs: f.carbs || 0, fat: f.fat || 0, serving_size: f.serving_size });
      });
      setDietDays(Object.entries(grouped).map(([num, foods]) => ({ dayNumber: Number(num), foods })).sort((a, b) => a.dayNumber - b.dayNumber));
    }
    setDetailLoading(false);
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const getProgress = (t: TrainingData) => {
    const currentWeek = Math.max(1, Math.ceil(t.elapsedDays / 7));
    const totalWeeks = Math.max(1, Math.ceil(t.totalDays / 7));
    const pct = Math.min(100, Math.round((t.elapsedDays / t.totalDays) * 100));
    return { currentWeek, totalWeeks, pct };
  };

  const getDietProgress = (d: DietData) => {
    if (!d.startDate || !d.durationWeeks) return null;
    const totalDays = d.durationWeeks * 7;
    const elapsedDays = Math.max(0, Math.ceil((Date.now() - new Date(d.startDate).getTime()) / 86400000));
    return {
      currentWeek: Math.min(Math.max(1, Math.ceil(elapsedDays / 7)), d.durationWeeks),
      totalWeeks: d.durationWeeks,
      pct: Math.min(100, Math.round((elapsedDays / totalDays) * 100)),
    };
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-muted-foreground" />
            Programlar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {/* ─── Training Programs ─── */}
          {trainings.length > 0 ? (
            trainings.map((t, idx) => {
              const { currentWeek, totalWeeks, pct } = getProgress(t);
              return (
                <div key={t.programId}>
                  {idx > 0 && <Separator className="my-1" />}
                  <div
                    className="rounded-lg p-3 hover:bg-secondary/40 transition-colors cursor-pointer"
                    onClick={() => openTrainingDialog(t)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
                          <Dumbbell className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-foreground truncate">{t.programName}</h4>
                          <p className="text-[11px] text-muted-foreground truncate">{t.description || "Aktif program"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0.5">
                          Hafta {currentWeek}/{totalWeeks}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => { setReplacingTraining(t); setAssignProgramOpen(true); }}>
                              <RefreshCw className="w-4 h-4 mr-2" />Değiştir
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleRevokeTraining(t)}>
                              <Trash2 className="w-4 h-4 mr-2" />Kaldır
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="ml-[42px]">
                      {t.startDate && (
                        <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1 mb-1.5">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(t.startDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">%{pct}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-3 text-center">
              <p className="text-[11px] text-muted-foreground italic mb-2">Henüz antrenman programı atanmadı.</p>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setAssignProgramOpen(true)}>
                <Plus className="w-3.5 h-3.5" />Antrenman Programı Ata
              </Button>
            </div>
          )}

          <Separator className="my-1" />

          {/* ─── Diet Programs ─── */}
          {diets.length > 0 ? (
            diets.map((d, idx) => {
              const dp = getDietProgress(d);
              return (
                <div key={d.templateId}>
                  {idx > 0 && <Separator className="my-1" />}
                  <div
                    className="rounded-lg p-3 hover:bg-secondary/40 transition-colors cursor-pointer"
                    onClick={() => openDietDialog(d)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-success/15 flex items-center justify-center shrink-0">
                          <Apple className="w-4 h-4 text-success" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-foreground truncate">{d.templateName}</h4>
                          <p className="text-[11px] text-muted-foreground truncate">{d.description || "Aktif beslenme planı"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {dp && (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px] px-1.5 py-0.5">
                            Hafta {dp.currentWeek}/{dp.totalWeeks}
                          </Badge>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => { setReplacingDiet(d); setAssignDietOpen(true); }}>
                              <RefreshCw className="w-4 h-4 mr-2" />Değiştir
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleRevokeDiet(d)}>
                              <Trash2 className="w-4 h-4 mr-2" />Kaldır
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="ml-[42px]">
                      {dp && (
                        <>
                          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1 mb-1.5">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(d.startDate!).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                          </span>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-success rounded-full transition-all" style={{ width: `${dp.pct}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">%{dp.pct}</span>
                          </div>
                        </>
                      )}
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {d.calories} kcal · {d.protein}g P · {d.carbs}g K · {d.fat}g Y
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-3 text-center">
              <p className="text-[11px] text-muted-foreground italic mb-2">Henüz beslenme planı atanmadı.</p>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setAssignDietOpen(true)}>
                <Plus className="w-3.5 h-3.5" />Beslenme Planı Ata
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Detail Dialog */}
      <Dialog open={trainingDialogOpen} onOpenChange={setTrainingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="block">{selectedTraining?.programName}</span>
                <span className="text-xs font-normal text-muted-foreground">{selectedTraining?.description || "Aktif antrenman programı"}</span>
              </div>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(85vh-120px)] px-6 pb-6">
            {selectedTraining && (() => {
              const { currentWeek, totalWeeks, pct } = getProgress(selectedTraining);
              return (
                <div className="mb-4 flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                    <Calendar className="w-3 h-3 mr-1" />Hafta {currentWeek}/{totalWeeks}
                  </Badge>
                  <Badge variant="outline" className="text-xs text-muted-foreground">%{pct} tamamlandı</Badge>
                </div>
              );
            })()}
            {detailLoading ? (
              <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
            ) : workoutDays.length > 0 ? (
              <div className="space-y-3">
                {workoutDays.map((day, i) => (
                  <div key={i} className="rounded-lg border border-border bg-secondary/30 overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-secondary/50">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-primary">{day.dayOfWeek}</span>
                        <span className="text-sm text-foreground">— {day.workoutName}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{day.exercises.length} hareket</Badge>
                    </div>
                    {day.exercises.length > 0 && (
                      <div className="divide-y divide-border/50">
                        {day.exercises.map((ex, j) => (
                          <div key={j} className="flex items-center justify-between px-3 py-2 text-xs">
                            <span className="text-foreground font-medium">{ex.name}</span>
                            <div className="flex items-center gap-3 text-muted-foreground">
                              <span>{ex.sets} set × {ex.reps}</span>
                              {ex.rir !== undefined && ex.rir !== null && <Badge variant="outline" className="text-[10px] py-0">RIR {ex.rir}</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic text-center py-8">Henüz antrenman günü atanmamış.</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Diet Detail Dialog */}
      <Dialog open={dietDialogOpen} onOpenChange={setDietDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <Apple className="w-5 h-5 text-success" />
              </div>
              <div>
                <span className="block">{selectedDiet?.templateName}</span>
                <span className="text-xs font-normal text-muted-foreground">{selectedDiet?.description || "Aktif beslenme planı"}</span>
              </div>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(85vh-120px)] px-6 pb-6">
            {selectedDiet && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { val: selectedDiet.calories, label: "kcal", color: "text-foreground" },
                  { val: `${selectedDiet.protein}g`, label: "protein", color: "text-blue-400" },
                  { val: `${selectedDiet.carbs}g`, label: "karb", color: "text-amber-400" },
                  { val: `${selectedDiet.fat}g`, label: "yağ", color: "text-rose-400" },
                ].map((m, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-secondary/50 text-center border border-border/50">
                    <p className={`text-base font-bold font-mono ${m.color}`}>{m.val}</p>
                    <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>
            )}
            {detailLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}</div>
            ) : dietDays.length > 0 ? (
              <div className="space-y-4">
                {dietDays.map((day) => (
                  <div key={day.dayNumber} className="rounded-lg border border-border bg-secondary/30 overflow-hidden">
                    <div className="p-3 bg-secondary/50 flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 text-success" />
                      <span className="text-sm font-semibold text-foreground">{DAY_LABELS[day.dayNumber - 1] || `Gün ${day.dayNumber}`}</span>
                    </div>
                    <div className="p-3 space-y-3">
                      {Object.entries(
                        day.foods.reduce<Record<string, DietDayFood[]>>((acc, f) => {
                          if (!acc[f.meal_type]) acc[f.meal_type] = [];
                          acc[f.meal_type].push(f);
                          return acc;
                        }, {})
                      ).map(([mealType, foods]) => (
                        <div key={mealType}>
                          <p className="text-[11px] font-semibold text-success mb-1.5">{MEAL_LABELS[mealType] || mealType}</p>
                          <div className="space-y-1">
                            {foods.map((f, i) => (
                              <div key={i} className="flex items-center justify-between text-xs bg-background/50 rounded-md px-2.5 py-1.5">
                                <div>
                                  <span className="text-foreground font-medium">{f.food_name}</span>
                                  {f.serving_size && <span className="text-muted-foreground ml-1.5">({f.serving_size})</span>}
                                </div>
                                <div className="flex items-center gap-3 font-mono text-muted-foreground">
                                  <span>{f.calories} kcal</span>
                                  <span className="text-blue-400">{f.protein}g P</span>
                                  <span className="text-amber-400">{f.carbs}g K</span>
                                  <span className="text-rose-400">{f.fat}g Y</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic text-center py-8">Şablonda henüz yiyecek eklenmemiş.</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Assign Training Dialog */}
      <AssignTrainingDialog
        open={assignProgramOpen}
        onOpenChange={(open) => { setAssignProgramOpen(open); if (!open) setReplacingTraining(null); }}
        athleteId={athleteId}
        onAssigned={async () => {
          if (replacingTraining) await handleRevokeTraining(replacingTraining);
          setReplacingTraining(null);
          fetchData();
        }}
      />

      {/* Assign Diet Dialog */}
      <AssignDietTemplateDialog
        open={assignDietOpen}
        onOpenChange={(open) => { setAssignDietOpen(open); if (!open) setReplacingDiet(null); }}
        athleteId={athleteId}
        onAssigned={async () => {
          if (replacingDiet) await handleRevokeDiet(replacingDiet);
          setReplacingDiet(null);
          fetchData();
        }}
      />
    </>
  );
}

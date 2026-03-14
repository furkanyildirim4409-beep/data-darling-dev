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
import { Dumbbell, Apple, Calendar, Clock, Target, ChevronRight, MoreVertical, Trash2, RefreshCw, LayoutGrid } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ReplaceProgramDialog } from "@/components/athlete-detail/ReplaceProgramDialog";
import { AssignDietTemplateDialog } from "@/components/athlete-detail/AssignDietTemplateDialog";

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
  const [training, setTraining] = useState<TrainingData | null>(null);
  const [diet, setDiet] = useState<DietData | null>(null);

  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [dietDialogOpen, setDietDialogOpen] = useState(false);
  const [replaceProgramOpen, setReplaceProgramOpen] = useState(false);
  const [replaceDietOpen, setReplaceDietOpen] = useState(false);

  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([]);
  const [dietDays, setDietDays] = useState<DietDay[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const [profileRes, nutritionRes] = await Promise.all([
      supabase.from("profiles").select("active_program_id").eq("id", athleteId).maybeSingle(),
      supabase.from("nutrition_targets").select("active_diet_template_id, daily_calories, protein_g, carbs_g, fat_g, diet_start_date, diet_duration_weeks").eq("athlete_id", athleteId).maybeSingle(),
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
        setTraining({ programId, programName: programRes.data.title, description: programRes.data.description, startDate, totalDays, elapsedDays: Math.min(elapsedDays, totalDays) });
      }
    } else {
      setTraining(null);
    }

    const templateId = nutritionRes.data?.active_diet_template_id;
    const ntData = nutritionRes.data as any;
    if (templateId) {
      const tplRes = await supabase.from("diet_templates").select("title, description").eq("id", templateId).maybeSingle();
      setDiet({ templateId, templateName: tplRes.data?.title || "Beslenme Planı", description: tplRes.data?.description || null, calories: nutritionRes.data?.daily_calories || 0, protein: nutritionRes.data?.protein_g || 0, carbs: nutritionRes.data?.carbs_g || 0, fat: nutritionRes.data?.fat_g || 0, startDate: ntData?.diet_start_date || null, durationWeeks: ntData?.diet_duration_weeks || null });
    } else if (nutritionRes.data) {
      setDiet({ templateId: null, templateName: "Özel Hedefler", description: null, calories: nutritionRes.data.daily_calories || 0, protein: nutritionRes.data.protein_g || 0, carbs: nutritionRes.data.carbs_g || 0, fat: nutritionRes.data.fat_g || 0, startDate: null, durationWeeks: null });
    } else {
      setDiet(null);
    }
    setIsLoading(false);
    setWorkoutDays([]);
    setDietDays([]);
  }, [athleteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRevokeTraining = async () => {
    if (!training || !user) return;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    await supabase.from("assigned_workouts").delete().eq("athlete_id", athleteId).eq("program_id", training.programId).gte("scheduled_date", todayStr);
    await supabase.from("profiles").update({ active_program_id: null } as any).eq("id", athleteId);
    await supabase.from("program_assignment_logs").insert({ athlete_id: athleteId, coach_id: user.id, program_id: training.programId, program_title: training.programName, action: "removed" });
    toast.success("Antrenman programı iptal edildi");
    fetchData();
  };

  const handleRevokeDiet = async () => {
    if (!diet?.templateId || !user) return;
    await supabase.from("nutrition_targets").update({ active_diet_template_id: null, diet_start_date: null, diet_duration_weeks: null, updated_at: new Date().toISOString() } as any).eq("athlete_id", athleteId);
    toast.success("Beslenme programı iptal edildi");
    fetchData();
  };

  const openTrainingDialog = useCallback(async () => {
    if (!training) return;
    setTrainingDialogOpen(true);
    if (workoutDays.length > 0) return;
    setDetailLoading(true);
    const { data } = await supabase.from("assigned_workouts").select("day_of_week, workout_name, exercises").eq("athlete_id", athleteId).eq("program_id", training.programId);
    if (data) {
      const days: WorkoutDay[] = data.map((w: any) => ({
        dayOfWeek: w.day_of_week || "—",
        workoutName: w.workout_name || "Antrenman",
        exercises: Array.isArray(w.exercises) ? w.exercises.map((e: any) => ({ name: e.name || e.exerciseName || "—", sets: e.sets || 0, reps: e.reps || "—", rir: e.rir })) : [],
      })).sort((a, b) => DAY_LABELS.indexOf(a.dayOfWeek) - DAY_LABELS.indexOf(b.dayOfWeek));
      setWorkoutDays(days);
    }
    setDetailLoading(false);
  }, [training, workoutDays.length, athleteId]);

  const openDietDialog = useCallback(async () => {
    if (!diet) return;
    setDietDialogOpen(true);
    if (dietDays.length > 0 || !diet.templateId) return;
    setDetailLoading(true);
    const { data } = await supabase.from("diet_template_foods").select("day_number, meal_type, food_name, calories, protein, carbs, fat, serving_size").eq("template_id", diet.templateId).order("day_number").order("meal_type");
    if (data) {
      const grouped: Record<number, DietDayFood[]> = {};
      data.forEach((f: any) => {
        const d = f.day_number || 1;
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push({ meal_type: f.meal_type, food_name: f.food_name, calories: f.calories || 0, protein: f.protein || 0, carbs: f.carbs || 0, fat: f.fat || 0, serving_size: f.serving_size });
      });
      setDietDays(Object.entries(grouped).map(([num, foods]) => ({ dayNumber: Number(num), foods })).sort((a, b) => a.dayNumber - b.dayNumber));
    }
    setDetailLoading(false);
  }, [diet, dietDays.length]);

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

  const currentWeek = training ? Math.max(1, Math.ceil(training.elapsedDays / 7)) : 0;
  const totalWeeks = training ? Math.max(1, Math.ceil(training.totalDays / 7)) : 1;
  const progressPct = training ? Math.min(100, Math.round((training.elapsedDays / training.totalDays) * 100)) : 0;

  // Diet progress
  let dietCurrentWeek = 0;
  let dietTotalWeeks = 0;
  let dietProgressPct = 0;
  if (diet?.startDate && diet?.durationWeeks) {
    const totalDays = diet.durationWeeks * 7;
    const elapsedDays = Math.max(0, Math.ceil((Date.now() - new Date(diet.startDate).getTime()) / 86400000));
    dietCurrentWeek = Math.min(Math.max(1, Math.ceil(elapsedDays / 7)), diet.durationWeeks);
    dietTotalWeeks = diet.durationWeeks;
    dietProgressPct = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
  }

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
          {/* ─── Training Section ─── */}
          <div
            className="rounded-lg p-3 hover:bg-secondary/40 transition-colors cursor-pointer"
            onClick={openTrainingDialog}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
                  <Dumbbell className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-foreground truncate">
                    {training ? training.programName : "Program Yok"}
                  </h4>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {training?.description || (training ? "Aktif program" : "Henüz program atanmadı")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {training && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0.5">
                    Hafta {currentWeek}/{totalWeeks}
                  </Badge>
                )}
                {training && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => setReplaceProgramOpen(true)}>
                        <RefreshCw className="w-4 h-4 mr-2" />Değiştir
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleRevokeTraining}>
                        <Trash2 className="w-4 h-4 mr-2" />İptal Et
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            {training ? (
              <div className="ml-[42px]">
                {training.startDate && (
                  <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1 mb-1.5">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(training.startDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">%{progressPct}</span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic ml-[42px]">Antrenman Programı sekmesinden bir program atayabilirsiniz.</p>
            )}
          </div>

          <Separator className="my-1" />

          {/* ─── Diet Section ─── */}
          <div
            className="rounded-lg p-3 hover:bg-secondary/40 transition-colors cursor-pointer"
            onClick={openDietDialog}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-md bg-success/15 flex items-center justify-center shrink-0">
                  <Apple className="w-4 h-4 text-success" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-foreground truncate">
                    {diet ? diet.templateName : "Beslenme Planı Yok"}
                  </h4>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {diet?.description || (diet ? "Aktif beslenme planı" : "Henüz beslenme planı atanmadı")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {diet?.startDate && diet?.durationWeeks && (
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px] px-1.5 py-0.5">
                    Hafta {dietCurrentWeek}/{dietTotalWeeks}
                  </Badge>
                )}
                {diet?.templateId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => setReplaceDietOpen(true)}>
                        <RefreshCw className="w-4 h-4 mr-2" />Değiştir
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleRevokeDiet}>
                        <Trash2 className="w-4 h-4 mr-2" />İptal Et
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            {diet ? (
              <div className="ml-[42px]">
                {diet.startDate && diet.durationWeeks && (
                  <>
                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1 mb-1.5">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(diet.startDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                    </span>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-success rounded-full transition-all" style={{ width: `${dietProgressPct}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">%{dietProgressPct}</span>
                    </div>
                  </>
                )}
                <p className="text-[11px] text-muted-foreground font-mono">
                  {diet.calories} kcal · {diet.protein}g P · {diet.carbs}g K · {diet.fat}g Y
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic ml-[42px]">Beslenme Planı sekmesinden bir şablon atayabilirsiniz.</p>
            )}
          </div>
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
                <span className="block">{training?.programName}</span>
                <span className="text-xs font-normal text-muted-foreground">{training?.description || "Aktif antrenman programı"}</span>
              </div>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(85vh-120px)] px-6 pb-6">
            {training && (
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                  <Calendar className="w-3 h-3 mr-1" />Hafta {currentWeek}/{totalWeeks}
                </Badge>
                <Badge variant="outline" className="text-xs text-muted-foreground">%{progressPct} tamamlandı</Badge>
              </div>
            )}
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
                <span className="block">{diet?.templateName}</span>
                <span className="text-xs font-normal text-muted-foreground">{diet?.description || "Aktif beslenme planı"}</span>
              </div>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(85vh-120px)] px-6 pb-6">
            {diet && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { val: diet.calories, label: "kcal", color: "text-foreground" },
                  { val: `${diet.protein}g`, label: "protein", color: "text-blue-400" },
                  { val: `${diet.carbs}g`, label: "karb", color: "text-amber-400" },
                  { val: `${diet.fat}g`, label: "yağ", color: "text-rose-400" },
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
            ) : diet?.templateId ? (
              <p className="text-sm text-muted-foreground italic text-center py-8">Şablonda henüz yiyecek eklenmemiş.</p>
            ) : (
              <p className="text-sm text-muted-foreground italic text-center py-8">Özel hedefler — şablon detayı yok.</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Replace Program Dialog */}
      {training && (
        <AssignProgramDialog
          open={replaceProgramOpen}
          onOpenChange={(open) => { setReplaceProgramOpen(open); if (!open) fetchData(); }}
          programId={training.programId}
          programName={training.programName}
          preSelectedAthleteIds={[athleteId]}
        />
      )}

      {/* Replace Diet Dialog */}
      <AssignDietTemplateDialog
        open={replaceDietOpen}
        onOpenChange={(open) => { setReplaceDietOpen(open); if (!open) fetchData(); }}
        athleteId={athleteId}
        onAssigned={fetchData}
        activeTemplateId={diet?.templateId}
      />
    </>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dumbbell, Calendar, Clock, StickyNote, Zap, Loader2, Trash2, Target, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExerciseJson {
  name: string;
  sets?: number;
  reps?: string;
  rir?: number;
  failure_set?: boolean;
  rest_time?: string;
  notes?: string;
}

interface AssignedWorkout {
  id: string;
  workout_name: string;
  day_notes: string | null;
  day_of_week: string | null;
  scheduled_date: string | null;
  status: string | null;
  program_id: string | null;
  exercises: ExerciseJson[];
}

const DAY_NAMES = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

interface ProgramInfo {
  id: string;
  title: string;
  difficulty: string | null;
  target_goal: string | null;
  description: string | null;
}

interface ProgramTabProps {
  athleteId: string;
  currentProgram: string;
}

export function ProgramTab({ athleteId }: ProgramTabProps) {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<AssignedWorkout[]>([]);
  const [programInfo, setProgramInfo] = useState<ProgramInfo | null>(null);
  const [activeProgramId, setActiveProgramId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // 1. Get athlete's active_program_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("active_program_id")
      .eq("id", athleteId)
      .single();

    const apId = (profile as any)?.active_program_id as string | null;
    setActiveProgramId(apId);

    if (!apId) {
      setProgramInfo(null);
      setWorkouts([]);
      setLoading(false);
      return;
    }

    // 2. Fetch program info and assigned workouts in parallel
    const [programRes, workoutsRes] = await Promise.all([
      supabase.from("programs").select("id, title, difficulty, target_goal, description").eq("id", apId).single(),
      supabase
        .from("assigned_workouts")
        .select("id, workout_name, day_notes, day_of_week, scheduled_date, status, program_id, exercises")
        .eq("athlete_id", athleteId)
        .eq("program_id", apId),
    ]);

    if (programRes.data) {
      setProgramInfo(programRes.data);
    }

    setWorkouts(
      (workoutsRes.data ?? []).map((d) => ({
        ...d,
        day_notes: (d as any).day_notes ?? null,
        exercises: Array.isArray(d.exercises) ? (d.exercises as unknown as ExerciseJson[]) : [],
      }))
    );

    setLoading(false);
  }, [athleteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRemoveProgram = async () => {
    setRemoving(true);

    // 1. Delete all assigned_workouts for this program+athlete
    if (activeProgramId) {
      await supabase
        .from("assigned_workouts")
        .delete()
        .eq("athlete_id", athleteId)
        .eq("program_id", activeProgramId);
    }

    // 2. Clear active_program_id on profile
    await supabase
      .from("profiles")
      .update({ active_program_id: null } as any)
      .eq("id", athleteId);

    toast.success("Program kaldırıldı");
    setActiveProgramId(null);
    setProgramInfo(null);
    setWorkouts([]);
    setRemoving(false);
    setRemoveOpen(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  // No active program
  if (!activeProgramId || !programInfo) {
    return (
      <div className="glass rounded-xl border border-border p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Dumbbell className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Aktif program yok</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Bu sporcuya henüz bir antrenman programı atanmadı
        </p>
        <Button onClick={() => navigate("/programs")} className="bg-primary text-primary-foreground">
          <Dumbbell className="w-4 h-4 mr-2" />
          Program Mimarı'na Git
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {/* Active Program Header */}
        <div className="glass rounded-xl border border-primary/30 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <RotateCcw className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-foreground">{programInfo.title}</h2>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                    Aktif Program
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {programInfo.difficulty && (
                    <span className="flex items-center gap-1">
                      <Target className="w-3.5 h-3.5" />
                      {programInfo.difficulty}
                    </span>
                  )}
                  {programInfo.target_goal && <span>• {programInfo.target_goal}</span>}
                  <span>• {workouts.length} gün/hafta</span>
                </div>
                {programInfo.description && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{programInfo.description}</p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
              onClick={() => setRemoveOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Programı Kaldır
            </Button>
          </div>
        </div>

        {/* Weekly Template */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Haftalık Şablon
          </h3>
          <div className="space-y-3">
            {workouts.map((workout) => (
              <div key={workout.id} className="glass rounded-xl border border-border overflow-hidden">
                {/* Day Header */}
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <Dumbbell className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-bold text-foreground truncate">{workout.workout_name}</h4>
                    {workout.scheduled_date && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(workout.scheduled_date + "T00:00:00").toLocaleDateString("tr-TR", {
                          weekday: "long",
                        })}
                      </span>
                    )}
                  </div>
                  <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border text-xs shrink-0">
                    {workout.exercises.length} egzersiz
                  </Badge>
                </div>

                {/* Day Notes */}
                {workout.day_notes && (
                  <div className="mx-4 mb-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                    <div className="flex items-start gap-2">
                      <StickyNote className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{workout.day_notes}</p>
                    </div>
                  </div>
                )}

                {/* Exercises */}
                {workout.exercises.length > 0 && (
                  <div className="px-4 pb-4">
                    <div className="space-y-1.5">
                      {workout.exercises.map((ex, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 border border-border/50"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-foreground truncate block">{ex.name}</span>
                              {ex.notes && (
                                <span className="text-[10px] text-muted-foreground truncate block">{ex.notes}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground shrink-0">
                            {ex.sets && <span>{ex.sets}set</span>}
                            {ex.reps && <span>×{ex.reps}</span>}
                            {ex.rir !== undefined && ex.rir !== null && (
                              <Badge variant="outline" className={cn("text-[10px] h-4 px-1", ex.rir === 0 && "border-destructive/50 text-destructive")}>
                                RIR {ex.rir}
                              </Badge>
                            )}
                            {ex.failure_set && <Zap className="w-3.5 h-3.5 text-destructive" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Remove Program Confirmation */}
      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Programı Kaldır</AlertDialogTitle>
            <AlertDialogDescription>
              "{programInfo.title}" programını bu sporcudan kaldırmak istediğinizden emin misiniz?
              Tüm haftalık şablon silinecek ve aktif program temizlenecektir. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveProgram}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Kaldır
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

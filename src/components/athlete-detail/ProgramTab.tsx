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
import { Dumbbell, Calendar, Edit, Clock, Trash2, StickyNote, Zap, Loader2 } from "lucide-react";
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
  scheduled_date: string | null;
  status: string | null;
  program_id: string | null;
  exercises: ExerciseJson[];
}

interface ProgramTabProps {
  athleteId: string;
  currentProgram: string;
}

export function ProgramTab({ athleteId, currentProgram }: ProgramTabProps) {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<AssignedWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<AssignedWorkout | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAssigned = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("assigned_workouts")
      .select("id, workout_name, day_notes, scheduled_date, status, program_id, exercises")
      .eq("athlete_id", athleteId)
      .order("scheduled_date", { ascending: true });

    if (error) {
      toast.error("Atanmış programlar yüklenemedi");
      setWorkouts([]);
    } else {
      setWorkouts(
        (data ?? []).map((d) => ({
          ...d,
          day_notes: (d as any).day_notes ?? null,
          exercises: Array.isArray(d.exercises) ? (d.exercises as unknown as ExerciseJson[]) : [],
        }))
      );
    }
    setLoading(false);
  }, [athleteId]);

  useEffect(() => {
    fetchAssigned();
  }, [fetchAssigned]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("assigned_workouts")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      toast.error("Silme başarısız: " + error.message);
    } else {
      toast.success(`"${deleteTarget.workout_name}" silindi`);
      setWorkouts((prev) => prev.filter((w) => w.id !== deleteTarget.id));
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const getStatusBadge = (s: string | null) => {
    switch (s) {
      case "completed":
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Tamamlandı</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Devam Ediyor</Badge>;
      default:
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Bekliyor</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <div className="glass rounded-xl border border-border p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Dumbbell className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Atanmış program yok</h3>
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
      <div className="space-y-4">
        {workouts.map((workout) => (
          <div key={workout.id} className="glass rounded-xl border border-border overflow-hidden">
            {/* Header */}
            <div className="p-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <Dumbbell className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-foreground truncate">{workout.workout_name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {getStatusBadge(workout.status)}
                    {workout.scheduled_date && (
                      <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border text-xs">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(workout.scheduled_date + "T00:00:00").toLocaleDateString("tr-TR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(workout)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
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
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Egzersizler ({workout.exercises.length})
                </h4>
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
                        {ex.failure_set && (
                          <Zap className="w-3.5 h-3.5 text-destructive" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Atamayı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.workout_name}" atamasını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

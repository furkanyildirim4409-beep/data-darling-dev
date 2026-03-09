import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Dumbbell, Clock, Trash2, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: number;
}

interface AssignedWorkout {
  id: string;
  workout_name: string;
  scheduled_date: string;
  status: string | null;
  exercises: Exercise[];
  athlete_id: string | null;
}

interface WorkoutDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout: AssignedWorkout | null;
  onDeleted: () => void;
}

export function WorkoutDetailModal({
  open,
  onOpenChange,
  workout,
  onDeleted,
}: WorkoutDetailModalProps) {
  const [deleting, setDeleting] = useState(false);

  if (!workout) return null;

  const isCompleted = workout.status === "completed";
  const exercises = Array.isArray(workout.exercises) ? workout.exercises : [];

  const handleDelete = async () => {
    setDeleting(true);
    
    const { error } = await supabase
      .from("assigned_workouts")
      .delete()
      .eq("id", workout.id);
    
    setDeleting(false);

    if (error) {
      console.error(error);
      toast.error("Antrenman silinemedi");
    } else {
      toast.success("Antrenman silindi");
      onDeleted();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Dumbbell className="h-5 w-5 text-primary" />
                {workout.workout_name}
              </DialogTitle>
              <DialogDescription>
                {format(new Date(workout.scheduled_date), "d MMMM yyyy, EEEE", { locale: tr })}
              </DialogDescription>
            </div>
            <Badge
              variant={isCompleted ? "default" : "secondary"}
              className={cn(
                "flex items-center gap-1",
                isCompleted 
                  ? "bg-green-500/20 text-green-400 border-green-500/30" 
                  : "bg-primary/20 text-primary border-primary/30"
              )}
            >
              {isCompleted ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Tamamlandı
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3" />
                  Bekliyor
                </>
              )}
            </Badge>
          </div>
        </DialogHeader>

        <div className="py-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Egzersizler ({exercises.length})
          </h4>
          
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {exercises.map((exercise, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-4 rounded-lg border border-border/50 bg-background/50",
                    isCompleted && "opacity-70"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      isCompleted 
                        ? "bg-accent/40 text-accent-foreground" 
                        : "bg-primary/20 text-primary"
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-foreground">{exercise.name}</h5>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="font-medium text-foreground">{exercise.sets}</span>
                          <span>set</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-medium text-foreground">{exercise.reps}</span>
                          <span>tekrar</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span className="font-medium text-foreground">{exercise.rest}</span>
                          <span>sn</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {exercises.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Bu antrenmanda egzersiz bulunmuyor
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                disabled={deleting}
              >
                {deleting ? (
                  <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Sil
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle>Antrenmanı Sil</AlertDialogTitle>
                <AlertDialogDescription>
                  "{workout.workout_name}" antrenmanını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border">İptal</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Evet, Sil
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border"
          >
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

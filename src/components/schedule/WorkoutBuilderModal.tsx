import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Plus, Trash2, Dumbbell, Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: number;
}

interface WorkoutBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  athleteId: string;
  onSaved: () => void;
}

export function WorkoutBuilderModal({
  open,
  onOpenChange,
  selectedDate,
  athleteId,
  onSaved,
}: WorkoutBuilderModalProps) {
  const { user } = useAuth();
  const [workoutName, setWorkoutName] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: "", sets: 3, reps: "10", rest: 60 },
  ]);
  const [saving, setSaving] = useState(false);

  const addExercise = () => {
    setExercises([...exercises, { name: "", sets: 3, reps: "10", rest: 60 }]);
  };

  const removeExercise = (index: number) => {
    if (exercises.length > 1) {
      setExercises(exercises.filter((_, i) => i !== index));
    }
  };

  const updateExercise = (index: number, field: keyof Exercise, value: string | number) => {
    const updated = [...exercises];
    if (field === "sets" || field === "rest") {
      updated[index][field] = typeof value === "string" ? parseInt(value) || 0 : value;
    } else {
      updated[index][field] = value as string;
    }
    setExercises(updated);
  };

  const resetForm = () => {
    setWorkoutName("");
    setExercises([{ name: "", sets: 3, reps: "10", rest: 60 }]);
  };

  const handleSave = async () => {
    if (!user || !athleteId || !selectedDate) {
      toast.error("Gerekli bilgiler eksik");
      return;
    }

    if (!workoutName.trim()) {
      toast.error("Antrenman adı gerekli");
      return;
    }

    const validExercises = exercises.filter(e => e.name.trim());
    if (validExercises.length === 0) {
      toast.error("En az bir egzersiz ekleyin");
      return;
    }

    setSaving(true);

    // Prepare JSONB-compliant exercises array
    const exercisesJson = validExercises.map(e => ({
      name: e.name.trim(),
      sets: e.sets,
      reps: e.reps,
      rest: e.rest,
    }));

    const { error } = await supabase.from("assigned_workouts").insert({
      coach_id: user.id,
      athlete_id: athleteId,
      scheduled_date: format(selectedDate, "yyyy-MM-dd"),
      workout_name: workoutName.trim(),
      exercises: exercisesJson,
      status: "pending",
    });

    setSaving(false);

    if (error) {
      console.error(error);
      toast.error("Antrenman kaydedilemedi. RLS hatası olabilir.");
    } else {
      toast.success("Antrenman başarıyla atandı! 🏋️‍♂️");
      resetForm();
      onSaved();
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Dumbbell className="h-5 w-5 text-primary" />
            Yeni Antrenman Oluştur
          </DialogTitle>
          <DialogDescription>
            {selectedDate && (
              <span className="text-primary font-medium">
                {format(selectedDate, "d MMMM yyyy, EEEE", { locale: tr })}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Workout Name */}
          <div className="space-y-2">
            <Label htmlFor="workout-name" className="text-foreground">
              Antrenman Adı
            </Label>
            <Input
              id="workout-name"
              placeholder="örn: Push Day, Üst Vücut, Bacak Günü"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          {/* Exercises */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-foreground">Egzersizler</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addExercise}
                className="text-primary border-primary/30 hover:bg-primary/10"
              >
                <Plus className="h-4 w-4 mr-1" />
                Egzersiz Ekle
              </Button>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {exercises.map((exercise, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-4 rounded-lg border border-border/50 bg-background/50",
                      "hover:border-primary/30 transition-colors"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-3">
                        {/* Exercise Name */}
                        <Input
                          placeholder="Egzersiz adı (örn: Bench Press)"
                          value={exercise.name}
                          onChange={(e) => updateExercise(index, "name", e.target.value)}
                          className="bg-card border-border/50"
                        />
                        
                        {/* Sets, Reps, Rest */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Set</Label>
                            <Input
                              type="number"
                              min={1}
                              value={exercise.sets}
                              onChange={(e) => updateExercise(index, "sets", e.target.value)}
                              className="bg-card border-border/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Tekrar</Label>
                            <Input
                              placeholder="8-10"
                              value={exercise.reps}
                              onChange={(e) => updateExercise(index, "reps", e.target.value)}
                              className="bg-card border-border/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Dinlenme (sn)
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              step={15}
                              value={exercise.rest}
                              onChange={(e) => updateExercise(index, "rest", e.target.value)}
                              className="bg-card border-border/50"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Remove button */}
                      {exercises.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeExercise(index)}
                          className="text-muted-foreground hover:text-destructive flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="border-border"
          >
            İptal
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? (
              <>
                <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Dumbbell className="h-4 w-4 mr-2" />
                Antrenmanı Ata
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

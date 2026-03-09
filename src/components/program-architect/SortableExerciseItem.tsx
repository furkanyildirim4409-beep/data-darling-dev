import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Dumbbell, Apple, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { BuilderExercise, ExerciseGroup } from "./WorkoutBuilder";

interface SortableExerciseItemProps {
  exercise: BuilderExercise;
  exIndex: number;
  dayIndex: number;
  group: ExerciseGroup | undefined;
  groupMode: boolean;
  isSelected: boolean;
  getGroupColor: (groupId: string) => string;
  onToggleSelection: (id: string) => void;
  onRemoveExercise: (dayIndex: number, id: string) => void;
  onUpdateExercise: (dayIndex: number, id: string, field: keyof BuilderExercise, value: number | string | number[]) => void;
}

export function SortableExerciseItem({
  exercise,
  exIndex,
  dayIndex,
  group,
  groupMode,
  isSelected,
  getGroupColor,
  onToggleSelection,
  onRemoveExercise,
  onUpdateExercise,
}: SortableExerciseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => groupMode && onToggleSelection(exercise.id)}
      className={cn(
        "glass rounded-lg p-3 border transition-all",
        group ? `border-l-4 ${getGroupColor(group.id)} border-border` : "border-border",
        groupMode && "cursor-pointer",
        groupMode && isSelected && "ring-2 ring-primary bg-primary/5",
        !groupMode && "group hover:border-primary/30",
        isDragging && "shadow-lg"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {groupMode && (
          <div className={cn(
            "w-4 h-4 rounded border-2 shrink-0 transition-colors",
            isSelected ? "bg-primary border-primary" : "border-muted-foreground"
          )} />
        )}
        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
          {exIndex + 1}
        </div>
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-0.5 rounded hover:bg-muted/50 transition-colors"
          tabIndex={-1}
        >
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        {exercise.type === "exercise" ? (
          <Dumbbell className="w-3.5 h-3.5 text-primary" />
        ) : (
          <Apple className="w-3.5 h-3.5 text-success" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{exercise.name}</p>
          <div className="flex items-center gap-1">
            <p className="text-[10px] text-muted-foreground">{exercise.category}</p>
            {group && (
              <Badge variant="outline" className={cn(
                "text-[8px] h-4 px-1",
                group.type === "superset" ? "border-warning/30 text-warning" : "border-info/30 text-info"
              )}>
                {group.type === "superset" ? "SS" : "DV"}
              </Badge>
            )}
          </div>
        </div>
        {!groupMode && (
          <Button variant="ghost" size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onRemoveExercise(dayIndex, exercise.id)}>
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {exercise.type === "exercise" && !groupMode && (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">Set</label>
              <Input type="number" min={1} max={10} value={exercise.sets}
                onChange={(e) => onUpdateExercise(dayIndex, exercise.id, "sets", parseInt(e.target.value) || 1)}
                className="h-8 text-xs text-center bg-background/50" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">Tekrar</label>
              <Input type="number" min={1} max={50} value={exercise.reps}
                onChange={(e) => onUpdateExercise(dayIndex, exercise.id, "reps", parseInt(e.target.value) || 1)}
                className="h-8 text-xs text-center bg-background/50" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">RPE</label>
              <Input type="number" min={1} max={10} value={exercise.rpe}
                onChange={(e) => onUpdateExercise(dayIndex, exercise.id, "rpe", parseInt(e.target.value) || 7)}
                className="h-8 text-xs text-center bg-background/50" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">RIR</label>
              <Input type="number" min={0} max={5} value={exercise.rir ?? 2}
                onChange={(e) => onUpdateExercise(dayIndex, exercise.id, "rir", parseInt(e.target.value) || 0)}
                className={cn(
                  "h-8 text-xs text-center bg-background/50",
                  (exercise.rir ?? 2) === 0 && "border-destructive/50 text-destructive"
                )} />
            </div>
          </div>
          {/* Failure toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateExercise(dayIndex, exercise.id, "failureSet", exercise.failureSet ? 0 : 1)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all border",
                exercise.failureSet
                  ? "bg-destructive/15 border-destructive/30 text-destructive"
                  : "bg-muted/30 border-border text-muted-foreground hover:border-destructive/30"
              )}
            >
              <Zap className="w-3 h-3" />
              {exercise.failureSet ? "Failure Aktif" : "Failure"}
            </button>
            {(exercise.rir ?? 2) === 0 && !exercise.failureSet && (
              <span className="text-[9px] text-warning">⚠ RIR 0 = Failure'a yakın</span>
            )}
            {exercise.failureSet && (
              <span className="text-[9px] text-destructive">Son set failure'a kadar</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

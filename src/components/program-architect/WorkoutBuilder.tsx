import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Trash2,
  Dumbbell,
  Apple,
  X,
  GripVertical,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LibraryItem } from "./ProgramLibrary";

export interface BuilderExercise extends LibraryItem {
  sets: number;
  reps: number;
  rpe: number;
  notes?: string;
}

export interface DayPlan {
  day: number;
  label: string;
  exercises: BuilderExercise[];
}

const turkishDays = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];

interface WorkoutBuilderProps {
  weekPlan: DayPlan[];
  activeDay: number;
  onSetActiveDay: (index: number) => void;
  onUpdateDayLabel: (dayIndex: number, label: string) => void;
  onRemoveExercise: (dayIndex: number, exerciseId: string) => void;
  onUpdateExercise: (dayIndex: number, exerciseId: string, field: keyof BuilderExercise, value: number | string) => void;
  onClearDay: (dayIndex: number) => void;
  onClearAll: () => void;
}

export function WorkoutBuilder({
  weekPlan,
  activeDay,
  onSetActiveDay,
  onUpdateDayLabel,
  onRemoveExercise,
  onUpdateExercise,
  onClearDay,
  onClearAll,
}: WorkoutBuilderProps) {
  const totalExercises = weekPlan.reduce((acc, d) => acc + d.exercises.length, 0);
  const totalSets = weekPlan.reduce((acc, d) => acc + d.exercises.reduce((s, ex) => s + ex.sets, 0), 0);
  const activeDays = weekPlan.filter((d) => d.exercises.length > 0).length;

  return (
    <div className="glass rounded-xl border border-border h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-foreground">7 Günlük Program</h2>
          {totalExercises > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Tümünü Temizle
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Bir gün seçin, ardından kütüphaneden egzersiz ekleyin
        </p>
      </div>

      {/* Weekly Stats */}
      {totalExercises > 0 && (
        <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center gap-4">
          <Badge variant="secondary" className="text-xs">
            {activeDays}/7 Gün Aktif
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {totalExercises} Egzersiz
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {totalSets} Set
          </Badge>
        </div>
      )}

      <ScrollArea className="flex-1">
        <Accordion
          type="single"
          collapsible
          value={`day-${activeDay}`}
          onValueChange={(val) => {
            if (val) {
              const idx = parseInt(val.replace("day-", ""), 10);
              onSetActiveDay(idx);
            }
          }}
          className="px-3 py-2"
        >
          {weekPlan.map((dayPlan, index) => {
            const isRest = dayPlan.exercises.length === 0;
            const isActive = activeDay === index;
            const daySets = dayPlan.exercises.reduce((s, ex) => s + ex.sets, 0);

            return (
              <AccordionItem
                key={index}
                value={`day-${index}`}
                className={cn(
                  "mb-2 rounded-lg border transition-all overflow-hidden",
                  isActive
                    ? "border-primary/50 border-l-2 border-l-primary"
                    : "border-border",
                  isRest && !isActive && "opacity-60"
                )}
              >
                <AccordionTrigger className="px-3 py-2.5 hover:no-underline [&>svg]:hidden">
                  <div className="flex items-center gap-3 w-full pr-2">
                    <div className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isRest
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/20 text-primary"
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">
                        {turkishDays[index]}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {dayPlan.label || (isRest ? "Dinlenme Günü" : "Etiket ekleyin...")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isRest ? (
                        <Moon className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <>
                          <Badge variant="secondary" className="text-[10px] h-5">
                            {dayPlan.exercises.length} egz
                          </Badge>
                          <Badge variant="outline" className="text-[10px] h-5 border-primary/30 text-primary">
                            {daySets} set
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-3 pb-3 pt-0">
                  {/* Day Label Input */}
                  <div className="mb-3">
                    <Input
                      placeholder="Gün etiketi (ör. Push Day, Upper Body...)"
                      value={dayPlan.label}
                      onChange={(e) => onUpdateDayLabel(index, e.target.value)}
                      className="h-8 text-xs bg-background/50"
                    />
                  </div>

                  {/* Exercises */}
                  {dayPlan.exercises.length === 0 ? (
                    <div className="border-2 border-dashed rounded-lg p-4 border-border">
                      <div className="flex flex-col items-center text-muted-foreground">
                        <Dumbbell className="w-8 h-8 mb-2 opacity-40" />
                        <p className="text-xs font-medium">Egzersiz yok</p>
                        <p className="text-[10px] text-center mt-0.5">
                          Kütüphaneden "+" ile ekleyin
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dayPlan.exercises.map((exercise, exIndex) => (
                        <div
                          key={exercise.id}
                          className="glass rounded-lg p-3 border border-border group hover:border-primary/30 transition-all"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                              {exIndex + 1}
                            </div>
                            <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                            {exercise.type === "exercise" ? (
                              <Dumbbell className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <Apple className="w-3.5 h-3.5 text-success" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{exercise.name}</p>
                              <p className="text-[10px] text-muted-foreground">{exercise.category}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => onRemoveExercise(index, exercise.id)}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>

                          {exercise.type === "exercise" && (
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-[10px] text-muted-foreground mb-0.5 block">Set</label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={exercise.sets}
                                  onChange={(e) => onUpdateExercise(index, exercise.id, "sets", parseInt(e.target.value) || 1)}
                                  className="h-8 text-xs text-center bg-background/50"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground mb-0.5 block">Tekrar</label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={50}
                                  value={exercise.reps}
                                  onChange={(e) => onUpdateExercise(index, exercise.id, "reps", parseInt(e.target.value) || 1)}
                                  className="h-8 text-xs text-center bg-background/50"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground mb-0.5 block">RPE</label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={exercise.rpe}
                                  onChange={(e) => onUpdateExercise(index, exercise.id, "rpe", parseInt(e.target.value) || 7)}
                                  className="h-8 text-xs text-center bg-background/50"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Clear Day */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onClearDay(index)}
                        className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10 mt-1"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Günü Temizle
                      </Button>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Plus,
  Settings2,
  Zap,
  ChevronDown,
  ChevronUp,
  Link2,
  Unlink,
  RotateCcw,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LibraryItem } from "./ProgramLibrary";

export interface BuilderExercise extends LibraryItem {
  sets: number;
  reps: number;
  rpe: number;
  rir: number;
  failureSet: boolean;
  notes?: string;
  groupId?: string;
}

export type BlockType = "hypertrophy" | "strength" | "endurance" | "power" | "deload" | "none";

export interface DayPlan {
  day: number;
  label: string;
  blockType: BlockType;
  exercises: BuilderExercise[];
}

const blockTypes: { value: BlockType; label: string; color: string }[] = [
  { value: "none", label: "Seçilmedi", color: "" },
  { value: "hypertrophy", label: "Hipertrofi", color: "bg-primary/15 border-l-primary" },
  { value: "strength", label: "Güç", color: "bg-warning/15 border-l-warning" },
  { value: "endurance", label: "Dayanıklılık", color: "bg-info/15 border-l-info" },
  { value: "power", label: "Patlayıcı Güç", color: "bg-destructive/15 border-l-destructive" },
  { value: "deload", label: "Deload", color: "bg-muted/30 border-l-muted-foreground" },
];

export interface ExerciseGroup {
  id: string;
  type: "superset" | "circuit";
  exerciseIds: string[];
}

export interface AutomationRule {
  id: string;
  condition: string;
  action: string;
  value: string;
}

const turkishDays = [
  "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar",
];

const conditionOptions = [
  { value: "rpe_low", label: "RPE < 7 ise" },
  { value: "rpe_high", label: "RPE > 8 ise" },
  { value: "rir_0", label: "RIR = 0 (Failure) ise" },
  { value: "rir_1", label: "RIR ≤ 1 ise" },
  { value: "rir_3_plus", label: "RIR ≥ 3 ise" },
  { value: "failure_reached", label: "Failure'a Ulaşılırsa" },
  { value: "missed_workout", label: "Antrenman Kaçırılırsa" },
  { value: "sleep_low", label: "Uyku < 6 saat ise" },
  { value: "stress_high", label: "Stres Yüksek ise" },
  { value: "consecutive_failure", label: "Arka Arkaya 2x Failure ise" },
  { value: "volume_exceeded", label: "Haftalık Hacim Aşılırsa" },
];

const actionOptions = [
  { value: "increase_weight", label: "Ağırlığı Artır" },
  { value: "decrease_weight", label: "Ağırlığı Azalt" },
  { value: "add_rest", label: "Dinlenme Ekle" },
  { value: "reduce_volume", label: "Hacmi Azalt" },
  { value: "reduce_reps", label: "Tekrarı Düşür" },
  { value: "add_deload", label: "Deload Haftası Ekle" },
  { value: "switch_to_rir2", label: "RIR 2'ye Geç" },
  { value: "drop_set", label: "Drop Set Uygula" },
  { value: "notify_coach", label: "Koça Bildir" },
];

const groupColors: Record<string, string> = {};
const palette = [
  "border-l-primary",
  "border-l-warning",
  "border-l-destructive",
  "border-l-info",
  "border-l-success",
];

function getGroupColor(groupId: string): string {
  if (!groupColors[groupId]) {
    const idx = Object.keys(groupColors).length % palette.length;
    groupColors[groupId] = palette[idx];
  }
  return groupColors[groupId];
}

interface WorkoutBuilderProps {
  weekPlan: DayPlan[];
  activeDay: number;
  onSetActiveDay: (index: number) => void;
  onUpdateDayLabel: (dayIndex: number, label: string) => void;
  onUpdateDayBlockType: (dayIndex: number, blockType: BlockType) => void;
  onRemoveExercise: (dayIndex: number, exerciseId: string) => void;
  onUpdateExercise: (dayIndex: number, exerciseId: string, field: keyof BuilderExercise, value: number | string) => void;
  onClearDay: (dayIndex: number) => void;
  onClearAll: () => void;
  rules: AutomationRule[];
  onSetRules: (rules: AutomationRule[]) => void;
  dayGroups: Record<number, ExerciseGroup[]>;
  onSetDayGroups: (groups: Record<number, ExerciseGroup[]>) => void;
}

export function WorkoutBuilder({
  weekPlan,
  activeDay,
  onSetActiveDay,
  onUpdateDayLabel,
  onUpdateDayBlockType,
  onRemoveExercise,
  onUpdateExercise,
  onClearDay,
  onClearAll,
  rules,
  onSetRules,
  dayGroups,
  onSetDayGroups,
}: WorkoutBuilderProps) {
  const [showRules, setShowRules] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupMode, setGroupMode] = useState(false);

  const totalExercises = weekPlan.reduce((acc, d) => acc + d.exercises.length, 0);
  const totalSets = weekPlan.reduce((acc, d) => acc + d.exercises.reduce((s, ex) => s + ex.sets, 0), 0);
  const activeDayCount = weekPlan.filter((d) => d.exercises.length > 0).length;

  // --- Rules helpers ---
  const addRule = () => {
    onSetRules([...rules, {
      id: `rule-${Date.now()}`,
      condition: "rpe_low",
      action: "increase_weight",
      value: "%5",
    }]);
  };
  const removeRule = (id: string) => onSetRules(rules.filter((r) => r.id !== id));
  const updateRule = (id: string, field: keyof AutomationRule, value: string) => {
    onSetRules(rules.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  // --- Group helpers ---
  const getGroupsForDay = (dayIndex: number): ExerciseGroup[] => dayGroups[dayIndex] || [];

  const findGroupForExercise = (dayIndex: number, exerciseId: string): ExerciseGroup | undefined => {
    return getGroupsForDay(dayIndex).find((g) => g.exerciseIds.includes(exerciseId));
  };

  const toggleSelection = (exerciseId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      return next;
    });
  };

  const createGroup = (type: "superset" | "circuit") => {
    if (selectedIds.size < 2) return;
    const newGroup: ExerciseGroup = {
      id: `grp-${Date.now()}`,
      type,
      exerciseIds: Array.from(selectedIds),
    };
    onSetDayGroups({
      ...dayGroups,
      [activeDay]: [...(dayGroups[activeDay] || []), newGroup],
    });
    setSelectedIds(new Set());
    setGroupMode(false);
  };

  const dissolveGroup = (dayIndex: number, groupId: string) => {
    onSetDayGroups({
      ...dayGroups,
      [dayIndex]: (dayGroups[dayIndex] || []).filter((g) => g.id !== groupId),
    });
  };

  return (
    <div className="glass rounded-xl border border-border h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-foreground">7 Günlük Program</h2>
          {totalExercises > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearAll}
              className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4 mr-1.5" />Tümünü Temizle
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
          <Badge variant="secondary" className="text-xs">{activeDayCount}/7 Gün</Badge>
          <Badge variant="secondary" className="text-xs">{totalExercises} Egzersiz</Badge>
          <Badge variant="secondary" className="text-xs">{totalSets} Set</Badge>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="px-3 py-2">
          {/* 7-Day Accordion */}
          <Accordion
            type="single"
            collapsible
            value={`day-${activeDay}`}
            onValueChange={(val) => {
              if (val) {
                onSetActiveDay(parseInt(val.replace("day-", ""), 10));
                setSelectedIds(new Set());
                setGroupMode(false);
              }
            }}
          >
            {weekPlan.map((dayPlan, index) => {
              const isRest = dayPlan.exercises.length === 0;
              const isActive = activeDay === index;
              const daySets = dayPlan.exercises.reduce((s, ex) => s + ex.sets, 0);
              const dayGroupList = getGroupsForDay(index);
              const currentBlock = blockTypes.find((b) => b.value === dayPlan.blockType);
              const hasBlock = dayPlan.blockType && dayPlan.blockType !== "none";

              return (
                <AccordionItem key={index} value={`day-${index}`}
                  className={cn(
                    "mb-2 rounded-lg border transition-all overflow-hidden",
                    isActive ? "border-primary/50 border-l-2 border-l-primary" : "border-border",
                    isRest && !isActive && "opacity-60",
                    hasBlock && currentBlock?.color
                  )}>
                  <AccordionTrigger className="px-3 py-2.5 hover:no-underline [&>svg]:hidden">
                    <div className="flex items-center gap-3 w-full pr-2">
                      <div className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0",
                        isActive ? "bg-primary text-primary-foreground"
                          : isRest ? "bg-muted text-muted-foreground"
                          : "bg-primary/20 text-primary"
                      )}>{index + 1}</div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium truncate">{turkishDays[index]}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {hasBlock && currentBlock ? currentBlock.label + (dayPlan.label ? ` · ${dayPlan.label}` : '') 
                            : dayPlan.label || (isRest ? "Dinlenme Günü" : "Etiket ekleyin...")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isRest ? (
                          <Moon className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <>
                            {dayGroupList.length > 0 && (
                              <Badge variant="outline" className="text-[10px] h-5 border-warning/30 text-warning">
                                <Layers className="w-3 h-3 mr-0.5" />{dayGroupList.length}
                              </Badge>
                            )}
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
                    {/* Day Label + Block Type */}
                    <div className="mb-3 flex gap-2">
                      <Input placeholder="Gün etiketi (ör. Push Day, Upper Body...)"
                        value={dayPlan.label}
                        onChange={(e) => onUpdateDayLabel(index, e.target.value)}
                        className="h-8 text-xs bg-background/50 flex-1" />
                      <Select value={dayPlan.blockType || "none"} onValueChange={(val) => onUpdateDayBlockType(index, val as BlockType)}>
                        <SelectTrigger className="w-[130px] h-8 text-xs bg-background/50">
                          <SelectValue placeholder="Blok Tipi" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {blockTypes.map((bt) => (
                            <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Group Controls */}
                    {dayPlan.exercises.length >= 2 && (
                      <div className="mb-3 flex items-center gap-2 flex-wrap">
                        {!groupMode ? (
                          <Button variant="outline" size="sm" className="text-xs h-7"
                            onClick={() => { setGroupMode(true); setSelectedIds(new Set()); }}>
                            <Link2 className="w-3.5 h-3.5 mr-1" />Grup Oluştur
                          </Button>
                        ) : (
                          <>
                            <Badge variant="secondary" className="text-xs">
                              {selectedIds.size} seçili
                            </Badge>
                            <Button variant="outline" size="sm" className="text-xs h-7 border-warning/50 text-warning hover:bg-warning/10"
                              disabled={selectedIds.size < 2}
                              onClick={() => createGroup("superset")}>
                              <Link2 className="w-3.5 h-3.5 mr-1" />Süperset
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs h-7 border-info/50 text-info hover:bg-info/10"
                              disabled={selectedIds.size < 2}
                              onClick={() => createGroup("circuit")}>
                              <RotateCcw className="w-3.5 h-3.5 mr-1" />Devre
                            </Button>
                            <Button variant="ghost" size="sm" className="text-xs h-7"
                              onClick={() => { setGroupMode(false); setSelectedIds(new Set()); }}>
                              İptal
                            </Button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Active Groups List */}
                    {dayGroupList.length > 0 && (
                      <div className="mb-3 space-y-1">
                        {dayGroupList.map((grp) => (
                          <div key={grp.id} className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs",
                            grp.type === "superset" ? "bg-warning/10 text-warning" : "bg-info/10 text-info"
                          )}>
                            {grp.type === "superset" ? <Link2 className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                            <span className="font-medium">
                              {grp.type === "superset" ? "Süperset" : "Devre"}: {grp.exerciseIds.length} egzersiz
                            </span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto hover:bg-destructive/10"
                              onClick={() => dissolveGroup(index, grp.id)}>
                              <Unlink className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Exercises */}
                    {dayPlan.exercises.length === 0 ? (
                      <div className="border-2 border-dashed rounded-lg p-4 border-border">
                        <div className="flex flex-col items-center text-muted-foreground">
                          <Dumbbell className="w-8 h-8 mb-2 opacity-40" />
                          <p className="text-xs font-medium">Egzersiz yok</p>
                          <p className="text-[10px] text-center mt-0.5">Kütüphaneden "+" ile ekleyin</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dayPlan.exercises.map((exercise, exIndex) => {
                          const group = findGroupForExercise(index, exercise.id);
                          const isSelected = selectedIds.has(exercise.id);

                          return (
                            <div
                              key={exercise.id}
                              onClick={() => groupMode && toggleSelection(exercise.id)}
                              className={cn(
                                "glass rounded-lg p-3 border transition-all",
                                group ? `border-l-4 ${getGroupColor(group.id)} border-border` : "border-border",
                                groupMode && "cursor-pointer",
                                groupMode && isSelected && "ring-2 ring-primary bg-primary/5",
                                !groupMode && "group hover:border-primary/30"
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
                                <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
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
                                    onClick={() => onRemoveExercise(index, exercise.id)}>
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
                                        onChange={(e) => onUpdateExercise(index, exercise.id, "sets", parseInt(e.target.value) || 1)}
                                        className="h-8 text-xs text-center bg-background/50" />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-muted-foreground mb-0.5 block">Tekrar</label>
                                      <Input type="number" min={1} max={50} value={exercise.reps}
                                        onChange={(e) => onUpdateExercise(index, exercise.id, "reps", parseInt(e.target.value) || 1)}
                                        className="h-8 text-xs text-center bg-background/50" />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-muted-foreground mb-0.5 block">RPE</label>
                                      <Input type="number" min={1} max={10} value={exercise.rpe}
                                        onChange={(e) => onUpdateExercise(index, exercise.id, "rpe", parseInt(e.target.value) || 7)}
                                        className="h-8 text-xs text-center bg-background/50" />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-muted-foreground mb-0.5 block">RIR</label>
                                      <Input type="number" min={0} max={5} value={exercise.rir ?? 2}
                                        onChange={(e) => onUpdateExercise(index, exercise.id, "rir", parseInt(e.target.value) || 0)}
                                        className={cn(
                                          "h-8 text-xs text-center bg-background/50",
                                          (exercise.rir ?? 2) === 0 && "border-destructive/50 text-destructive"
                                        )} />
                                    </div>
                                  </div>
                                  {/* Failure toggle */}
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => onUpdateExercise(index, exercise.id, "failureSet", exercise.failureSet ? 0 : 1)}
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
                        })}

                        <Button variant="ghost" size="sm" onClick={() => onClearDay(index)}
                          className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10 mt-1">
                          <Trash2 className="w-3.5 h-3.5 mr-1" />Günü Temizle
                        </Button>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {/* Automation Rules */}
          <div className="border-t border-border pt-4 mt-2 px-1">
            <button
              onClick={() => setShowRules(!showRules)}
              className="flex items-center gap-2 text-sm font-medium text-foreground mb-3 hover:text-primary transition-colors"
            >
              <Settings2 className="w-4 h-4" />
              Otomasyon Kuralları
              {showRules ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <Badge variant="secondary" className="ml-2 text-xs">{rules.length}</Badge>
            </button>

            {showRules && (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div key={rule.id}
                    className="glass rounded-lg p-3 border border-border flex items-center gap-2 flex-wrap">
                    <Zap className="w-4 h-4 text-warning shrink-0" />
                    <Select value={rule.condition} onValueChange={(val) => updateRule(rule.id, "condition", val)}>
                      <SelectTrigger className="w-[150px] h-8 text-xs bg-background/50"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {conditionOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">→</span>
                    <Select value={rule.action} onValueChange={(val) => updateRule(rule.id, "action", val)}>
                      <SelectTrigger className="w-[130px] h-8 text-xs bg-background/50"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {actionOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input value={rule.value} onChange={(e) => updateRule(rule.id, "value", e.target.value)}
                      className="w-16 h-8 text-xs bg-background/50" />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive ml-auto"
                      onClick={() => removeRule(rule.id)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addRule} className="w-full mt-2 border-dashed">
                  <Plus className="w-4 h-4 mr-1.5" />Kural Ekle
                </Button>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

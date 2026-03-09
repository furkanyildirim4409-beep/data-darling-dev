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
  Copy,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { LibraryItem } from "./ProgramLibrary";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { SortableExerciseItem } from "./SortableExerciseItem";

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
  notes: string;
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
  onUpdateDayNotes: (dayIndex: number, notes: string) => void;
  onUpdateDayBlockType: (dayIndex: number, blockType: BlockType) => void;
  onRemoveExercise: (dayIndex: number, exerciseId: string) => void;
  onUpdateExercise: (dayIndex: number, exerciseId: string, field: keyof BuilderExercise, value: number | string) => void;
  onReorderExercises: (dayIndex: number, oldIndex: number, newIndex: number) => void;
  onClearDay: (dayIndex: number) => void;
  onDuplicateDay: (sourceDayIndex: number, targetDayIndex: number) => void;
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
  onUpdateDayNotes,
  onUpdateDayBlockType,
  onRemoveExercise,
  onUpdateExercise,
  onReorderExercises,
  onClearDay,
  onDuplicateDay,
  onClearAll,
  rules,
  onSetRules,
  dayGroups,
  onSetDayGroups,
}: WorkoutBuilderProps) {
  const [showRules, setShowRules] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupMode, setGroupMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = (dayIndex: number) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const exercises = weekPlan[dayIndex].exercises;
    const oldIndex = exercises.findIndex((e) => e.id === active.id);
    const newIndex = exercises.findIndex((e) => e.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorderExercises(dayIndex, oldIndex, newIndex);
    }
  };

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
                    {/* Day Name + Block Type */}
                    <div className="mb-2 flex gap-2">
                      <Input placeholder="Gün adı (ör. Push Day, Upper Body...)"
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

                    {/* Day Notes */}
                    <div className="mb-3">
                      <textarea
                        placeholder="Bu gün için notlar ekleyin... (ör. Isınma: 10dk koşu, Soğuma: stretching)"
                        value={dayPlan.notes || ""}
                        onChange={(e) => onUpdateDayNotes(index, e.target.value)}
                        rows={2}
                        className="w-full rounded-md border border-input bg-background/50 px-3 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 resize-none"
                      />
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
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd(index)}
                      >
                        <SortableContext
                          items={dayPlan.exercises.map((e) => e.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {dayPlan.exercises.map((exercise, exIndex) => (
                              <SortableExerciseItem
                                key={exercise.id}
                                exercise={exercise}
                                exIndex={exIndex}
                                dayIndex={index}
                                group={findGroupForExercise(index, exercise.id)}
                                groupMode={groupMode}
                                isSelected={selectedIds.has(exercise.id)}
                                getGroupColor={getGroupColor}
                                onToggleSelection={toggleSelection}
                                onRemoveExercise={onRemoveExercise}
                                onUpdateExercise={onUpdateExercise}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}

                    {dayPlan.exercises.length > 0 && (
                      <div className="flex gap-2 mt-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1 text-xs h-8">
                              <Copy className="w-3.5 h-3.5 mr-1" />Günü Kopyala
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-card border-border">
                            {turkishDays.map((dayName, targetIdx) => (
                              targetIdx !== index && (
                                <DropdownMenuItem
                                  key={targetIdx}
                                  onClick={() => onDuplicateDay(index, targetIdx)}
                                  className="text-xs"
                                >
                                  {dayName}
                                  {weekPlan[targetIdx].exercises.length > 0 && (
                                    <span className="ml-auto text-muted-foreground text-[10px]">
                                      ({weekPlan[targetIdx].exercises.length} egz)
                                    </span>
                                  )}
                                </DropdownMenuItem>
                              )
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="sm" onClick={() => onClearDay(index)}
                          className="flex-1 text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10">
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

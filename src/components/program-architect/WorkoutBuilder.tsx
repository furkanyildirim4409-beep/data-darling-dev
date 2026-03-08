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
  Plus,
  Trash2,
  Settings2,
  Zap,
  Dumbbell,
  Apple,
  X,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LibraryItem } from "./ProgramLibrary";

export interface BuilderExercise extends LibraryItem {
  sets: number;
  reps: number;
  rpe: number;
  notes?: string;
}

interface AutomationRule {
  id: string;
  condition: string;
  action: string;
  value: string;
}

interface WorkoutBuilderProps {
  selectedExercises: BuilderExercise[];
  onRemoveExercise: (id: string) => void;
  onUpdateExercise: (id: string, field: keyof BuilderExercise, value: number | string) => void;
  onClearAll: () => void;
}

const blockTypes = [
  { value: "hypertrophy", label: "Hipertrofi Bloğu", color: "bg-primary/20 border-primary/30" },
  { value: "strength", label: "Güç Bloğu", color: "bg-warning/20 border-warning/30" },
  { value: "endurance", label: "Dayanıklılık Bloğu", color: "bg-info/20 border-info/30" },
  { value: "nutrition", label: "Beslenme Bloğu", color: "bg-success/20 border-success/30" },
];

const conditionOptions = [
  { value: "rpe_low", label: "RPE < 7 ise" },
  { value: "rpe_high", label: "RPE > 8 ise" },
  { value: "missed_workout", label: "Antrenman Kaçırılırsa" },
  { value: "sleep_low", label: "Uyku < 6 saat ise" },
  { value: "stress_high", label: "Stres Yüksek ise" },
];

const actionOptions = [
  { value: "increase_weight", label: "Ağırlığı Artır" },
  { value: "decrease_weight", label: "Ağırlığı Azalt" },
  { value: "add_rest", label: "Dinlenme Ekle" },
  { value: "reduce_volume", label: "Hacmi Azalt" },
  { value: "notify_coach", label: "Koça Bildir" },
];

export function WorkoutBuilder({ 
  selectedExercises, 
  onRemoveExercise,
  onUpdateExercise,
  onClearAll
}: WorkoutBuilderProps) {
  const [blockName, setBlockName] = useState("Hipertrofi Bloğu A");
  const [blockType, setBlockType] = useState<string>("hypertrophy");
  const [rules, setRules] = useState<AutomationRule[]>([
    { id: "rule-1", condition: "rpe_low", action: "increase_weight", value: "%5" },
  ]);
  const [showRules, setShowRules] = useState(true);

  const addRule = () => {
    setRules([
      ...rules,
      {
        id: `rule-${Date.now()}`,
        condition: "rpe_low",
        action: "increase_weight",
        value: "%5",
      },
    ]);
  };

  const removeRule = (ruleId: string) => {
    setRules(rules.filter((r) => r.id !== ruleId));
  };

  const updateRule = (ruleId: string, field: keyof AutomationRule, value: string) => {
    setRules(rules.map((r) => (r.id === ruleId ? { ...r, [field]: value } : r)));
  };

  const getBlockColor = (type: string) => {
    return blockTypes.find((bt) => bt.value === type)?.color || "";
  };

  const totalSets = selectedExercises.reduce((acc, ex) => acc + ex.sets, 0);
  const avgRPE = selectedExercises.length > 0 
    ? (selectedExercises.reduce((acc, ex) => acc + ex.rpe, 0) / selectedExercises.length).toFixed(1)
    : 0;

  return (
    <div className="glass rounded-xl border border-border h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-foreground">Antrenman Oluşturucu</h2>
          {selectedExercises.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearAll}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Temizle
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Kütüphaneden egzersiz eklemek için "+" butonuna tıklayın
        </p>
      </div>

      {/* Block Header */}
      <div className={cn("p-3 border-b flex items-center gap-3", getBlockColor(blockType))}>
        <Input
          value={blockName}
          onChange={(e) => setBlockName(e.target.value)}
          className="h-8 text-sm font-medium bg-transparent border-none p-0 focus-visible:ring-0 flex-1"
        />
        <Select value={blockType} onValueChange={setBlockType}>
          <SelectTrigger className="w-[140px] h-8 text-xs bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {blockTypes.map((bt) => (
              <SelectItem key={bt.value} value={bt.value}>
                {bt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Bar */}
      {selectedExercises.length > 0 && (
        <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center gap-4">
          <Badge variant="secondary" className="text-xs">
            {selectedExercises.length} Egzersiz
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {totalSets} Set
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Ort. RPE: {avgRPE}
          </Badge>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Exercise List */}
          {selectedExercises.length === 0 ? (
            <div className="border-2 border-dashed rounded-xl p-6 transition-all border-border">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Dumbbell className="w-10 h-10 mb-3 opacity-50" />
                <p className="text-sm font-medium mb-1">Henüz egzersiz eklenmedi</p>
                <p className="text-xs text-center">
                  Sol panelden egzersiz seçerek programa ekleyin
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedExercises.map((exercise, index) => (
                <div
                  key={exercise.id}
                  className="glass rounded-lg p-4 border border-border group hover:border-primary/30 transition-all"
                >
                  {/* Exercise Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">
                      {index + 1}
                    </div>
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    {exercise.type === "exercise" ? (
                      <Dumbbell className="w-4 h-4 text-primary" />
                    ) : (
                      <Apple className="w-4 h-4 text-success" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{exercise.name}</p>
                      <p className="text-xs text-muted-foreground">{exercise.category}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onRemoveExercise(exercise.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Exercise Inputs */}
                  {exercise.type === "exercise" && (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Set</label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={exercise.sets}
                          onChange={(e) => onUpdateExercise(exercise.id, "sets", parseInt(e.target.value) || 1)}
                          className="h-9 text-center bg-background/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Tekrar</label>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={exercise.reps}
                          onChange={(e) => onUpdateExercise(exercise.id, "reps", parseInt(e.target.value) || 1)}
                          className="h-9 text-center bg-background/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">RPE</label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={exercise.rpe}
                          onChange={(e) => onUpdateExercise(exercise.id, "rpe", parseInt(e.target.value) || 7)}
                          className="h-9 text-center bg-background/50"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Automation Rules */}
          <div className="border-t border-border pt-4">
            <button
              onClick={() => setShowRules(!showRules)}
              className="flex items-center gap-2 text-sm font-medium text-foreground mb-3 hover:text-primary transition-colors"
            >
              <Settings2 className="w-4 h-4" />
              Otomasyon Kuralları
              {showRules ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              <Badge variant="secondary" className="ml-2 text-xs">
                {rules.length}
              </Badge>
            </button>

            {showRules && (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="glass rounded-lg p-3 border border-border flex items-center gap-2 flex-wrap"
                  >
                    <Zap className="w-4 h-4 text-warning shrink-0" />
                    <Select
                      value={rule.condition}
                      onValueChange={(val) => updateRule(rule.id, "condition", val)}
                    >
                      <SelectTrigger className="w-[160px] h-8 text-xs bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {conditionOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">→</span>
                    <Select
                      value={rule.action}
                      onValueChange={(val) => updateRule(rule.id, "action", val)}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {actionOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={rule.value}
                      onChange={(e) => updateRule(rule.id, "value", e.target.value)}
                      className="w-16 h-8 text-xs bg-background/50"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive ml-auto"
                      onClick={() => removeRule(rule.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addRule}
                  className="w-full mt-2 border-dashed"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Kural Ekle
                </Button>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  ChevronDown,
  Plus,
  Trash2,
  Save,
  Loader2,
  Dumbbell,
} from "lucide-react";
import type { RoutineDay, WorkoutTemplate } from "./TemplateDashboard";

interface ExerciseEntry {
  name: string;
  sets: number;
  reps: string;
  rest: number;
}

const DEFAULT_DAYS: RoutineDay[] = Array.from({ length: 7 }, (_, i) => ({
  day: i + 1,
  label: "",
  exercises: [],
}));

interface Props {
  editingTemplate?: WorkoutTemplate | null;
  onBack: () => void;
  onSaved: () => void;
}

export default function RoutineBuilder({ editingTemplate, onBack, onSaved }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState(editingTemplate?.name ?? "");
  const [description, setDescription] = useState(editingTemplate?.description ?? "");
  const [days, setDays] = useState<RoutineDay[]>(() => {
    if (editingTemplate?.routine_days?.length) {
      const merged = DEFAULT_DAYS.map((dd) => {
        const existing = editingTemplate.routine_days.find((r) => r.day === dd.day);
        return existing ?? dd;
      });
      return merged;
    }
    return DEFAULT_DAYS;
  });
  const [openDays, setOpenDays] = useState<Set<number>>(new Set([1]));
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: number) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  };

  const updateDayLabel = useCallback((day: number, label: string) => {
    setDays((prev) => prev.map((d) => (d.day === day ? { ...d, label } : d)));
  }, []);

  const addExercise = useCallback((day: number) => {
    const newEx: ExerciseEntry = { name: "", sets: 3, reps: "10", rest: 60 };
    setDays((prev) =>
      prev.map((d) => (d.day === day ? { ...d, exercises: [...d.exercises, newEx] } : d))
    );
  }, []);

  const removeExercise = useCallback((day: number, idx: number) => {
    setDays((prev) =>
      prev.map((d) =>
        d.day === day ? { ...d, exercises: d.exercises.filter((_, i) => i !== idx) } : d
      )
    );
  }, []);

  const updateExercise = useCallback(
    (day: number, idx: number, field: keyof ExerciseEntry, value: string | number) => {
      setDays((prev) =>
        prev.map((d) =>
          d.day === day
            ? {
                ...d,
                exercises: d.exercises.map((ex, i) =>
                  i === idx ? { ...ex, [field]: value } : ex
                ),
              }
            : d
        )
      );
    },
    []
  );

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast.error("Program adı zorunludur.");
      return;
    }

    setSaving(true);
    const routineDays = days.filter((d) => d.label || d.exercises.length > 0);

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from("workout_templates")
          .update({
            name: name.trim(),
            description: description.trim() || null,
            routine_days: routineDays as any,
          })
          .eq("id", editingTemplate.id);

        if (error) throw error;
        toast.success("Program güncellendi! 🎉");
      } else {
        const { error } = await supabase.from("workout_templates").insert({
          name: name.trim(),
          description: description.trim() || null,
          routine_days: routineDays as any,
          coach_id: user.id,
        });

        if (error) throw error;
        toast.success("Program kaydedildi! 🎉");
      }
      onSaved();
    } catch (err: any) {
      toast.error("Kayıt başarısız: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalExercises = days.reduce((s, d) => s + d.exercises.length, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {editingTemplate ? "Programı Düzenle" : "Yeni Program Oluştur"}
            </h1>
            <p className="text-sm text-muted-foreground">7 günlük antrenman rutini tasarla</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
          {editingTemplate ? "Güncelle" : "Kaydet"}
        </Button>
      </div>

      {/* Meta */}
      <Card className="p-5 bg-card border-border space-y-4">
        <div>
          <Label className="text-sm font-medium text-foreground">Program Adı</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="örn. 4 Günlük Hypertrophy Split"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label className="text-sm font-medium text-foreground">Açıklama</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Program hakkında kısa notlar..."
            className="mt-1.5 min-h-[60px]"
          />
        </div>
      </Card>

      {/* Days */}
      <div className="space-y-3">
        {days.map((d) => (
          <Collapsible key={d.day} open={openDays.has(d.day)} onOpenChange={() => toggleDay(d.day)}>
            <Card className="bg-card border-border overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 hover:bg-secondary/40 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {d.day}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        Gün {d.day}
                        {d.label ? ` — ${d.label}` : ""}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {d.exercises.length === 0
                          ? "Dinlenme"
                          : `${d.exercises.length} egzersiz`}
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${
                      openDays.has(d.day) ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Gün Etiketi</Label>
                    <Input
                      value={d.label}
                      onChange={(e) => updateDayLabel(d.day, e.target.value)}
                      placeholder="örn. Push Day, Bacak, Dinlenme"
                      className="mt-1"
                    />
                  </div>

                  {d.exercises.length > 0 && (
                    <div className="space-y-2">
                      {/* Header row */}
                      <div className="grid grid-cols-[1fr_70px_70px_70px_36px] gap-2 text-xs text-muted-foreground px-1">
                        <span>Egzersiz</span>
                        <span>Set</span>
                        <span>Tekrar</span>
                        <span>Dinl.(s)</span>
                        <span />
                      </div>
                      {d.exercises.map((ex, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-[1fr_70px_70px_70px_36px] gap-2 items-center"
                        >
                          <Input
                            value={ex.name}
                            onChange={(e) => updateExercise(d.day, idx, "name", e.target.value)}
                            placeholder="Egzersiz adı"
                            className="h-9 text-sm"
                          />
                          <Input
                            type="number"
                            value={ex.sets}
                            onChange={(e) => updateExercise(d.day, idx, "sets", parseInt(e.target.value) || 0)}
                            className="h-9 text-sm"
                            min={1}
                          />
                          <Input
                            value={ex.reps}
                            onChange={(e) => updateExercise(d.day, idx, "reps", e.target.value)}
                            placeholder="8-10"
                            className="h-9 text-sm"
                          />
                          <Input
                            type="number"
                            value={ex.rest}
                            onChange={(e) => updateExercise(d.day, idx, "rest", parseInt(e.target.value) || 0)}
                            className="h-9 text-sm"
                            min={0}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-destructive"
                            onClick={() => removeExercise(d.day, idx)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addExercise(d.day)}
                    className="w-full border-dashed"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Egzersiz Ekle
                  </Button>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      {/* Footer summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground py-2">
        <span className="flex items-center gap-1.5">
          <Dumbbell className="w-4 h-4" />
          Toplam {totalExercises} egzersiz, {days.filter((d) => d.exercises.length > 0).length} aktif gün
        </span>
        <Button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
          {editingTemplate ? "Güncelle" : "Kaydet"}
        </Button>
      </div>
    </div>
  );
}

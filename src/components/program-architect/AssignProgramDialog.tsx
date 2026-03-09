import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { Json } from "@/integrations/supabase/types";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Loader2, CalendarDays, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAthletes } from "@/hooks/useAthletes";

interface AssignProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  programName: string;
}

interface WeekConfigDay {
  label?: string;
  notes?: string;
  blockType?: string;
  groups?: unknown[];
}

interface ExerciseRow {
  name: string;
  sets: number | null;
  reps: string | null;
  rir: number | null;
  failure_set: boolean | null;
  rest_time: string | null;
  notes: string | null;
  order_index: number | null;
}

const addDays = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, "0");
  const nd = String(date.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
};

export function AssignProgramDialog({
  open,
  onOpenChange,
  programId,
  programName,
}: AssignProgramDialogProps) {
  const { user } = useAuth();
  const { athletes, isLoading: athletesLoading } = useAthletes();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [saving, setSaving] = useState(false);
  const [activeDayCount, setActiveDayCount] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [activeDays, setActiveDays] = useState<Array<{ label: string; dayIdx: number }>>([]);

  // Fetch program structure for preview when dialog opens
  useEffect(() => {
    if (!open || !programId) return;
    let cancelled = false;

    const loadPreview = async () => {
      setLoadingPreview(true);
      const [{ data: exercises }, { data: program }] = await Promise.all([
        supabase.from("exercises").select("order_index").eq("program_id", programId),
        supabase.from("programs").select("week_config").eq("id", programId).single(),
      ]);

      if (cancelled) return;

      const weekConfig: WeekConfigDay[] = Array.isArray(program?.week_config)
        ? (program.week_config as WeekConfigDay[])
        : [];

      const daysWithExercises = new Set<number>();
      (exercises ?? []).forEach((ex) => {
        const dayIdx = Math.floor((ex.order_index ?? 0) / 100);
        daysWithExercises.add(dayIdx);
      });

      const active: Array<{ label: string; dayIdx: number }> = [];
      for (let i = 0; i < 7; i++) {
        const cfg = weekConfig[i];
        const hasExercises = daysWithExercises.has(i);
        const hasBlock = cfg?.blockType && cfg.blockType !== "none";
        if (hasExercises || hasBlock) {
          active.push({ label: cfg?.label || `Gün ${i + 1}`, dayIdx: i });
        }
      }
      setActiveDays(active);
      setActiveDayCount(active.length);
      setLoadingPreview(false);
    };

    loadPreview();
    return () => { cancelled = true; };
  }, [open, programId]);

  const toggleAthlete = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleAll = () =>
    setSelectedIds(
      selectedIds.length === athletes.length ? [] : athletes.map((a) => a.id)
    );

  const handleAssign = async () => {
    if (!user || selectedIds.length === 0) return;
    setSaving(true);

    try {
      // 1. Fetch exercises & program metadata in parallel
      const [{ data: exercises, error: exErr }, { data: program, error: pErr }] =
        await Promise.all([
          supabase.from("exercises").select("*").eq("program_id", programId),
          supabase.from("programs").select("week_config").eq("id", programId).single(),
        ]);

      if (exErr || pErr) throw new Error(exErr?.message || pErr?.message);

      const weekConfig: WeekConfigDay[] = Array.isArray(program?.week_config)
        ? (program.week_config as WeekConfigDay[])
        : [];

      // 2. Group exercises by day
      const dayExercises: Record<number, ExerciseRow[]> = {};
      (exercises ?? []).forEach((ex) => {
        const dayIdx = Math.floor((ex.order_index ?? 0) / 100);
        if (!dayExercises[dayIdx]) dayExercises[dayIdx] = [];
        dayExercises[dayIdx].push(ex as ExerciseRow);
      });

      // 3. Build payload
      const payload: Array<{
        coach_id: string;
        athlete_id: string;
        program_id: string;
        scheduled_date: string;
        workout_name: string;
        day_notes: string;
        exercises: Json;
        status: string;
      }> = [];

      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const cfg = weekConfig[dayIdx];
        const exs = dayExercises[dayIdx];
        const hasExercises = exs && exs.length > 0;
        const hasBlock = cfg?.blockType && cfg.blockType !== "none";

        if (!hasExercises && !hasBlock) continue;

        const dayLabel = cfg?.label || `Gün ${dayIdx + 1}`;
        const dayNotes = cfg?.notes || "";
        const targetDate = addDays(scheduledDate, dayIdx);

        const exercisesJson = (exs ?? [])
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((ex) => ({
            name: ex.name,
            sets: ex.sets ?? 3,
            reps: ex.reps ?? "10",
            rir: ex.rir ?? 2,
            failure_set: ex.failure_set ?? false,
            rest_time: ex.rest_time ?? "",
            notes: ex.notes ?? "",
          }));

        for (const athleteId of selectedIds) {
          payload.push({
            coach_id: user.id,
            athlete_id: athleteId,
            program_id: programId,
            scheduled_date: targetDate,
            workout_name: dayLabel,
            day_notes: dayNotes,
            exercises: exercisesJson as Json,
            status: "pending",
          });
        }
      }

      if (payload.length === 0) {
        toast.error("Bu programda atanacak aktif gün bulunamadı");
        setSaving(false);
        return;
      }

      // 4. Batch insert
      const { error } = await supabase.from("assigned_workouts").insert(payload);
      if (error) throw error;

      toast.success(
        `Program başarıyla atandı! Sporcunun takvimi güncellendi. 🚀`
      );
      setSelectedIds([]);
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Bilinmeyen hata";
      toast.error("Atama başarısız: " + message);
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const totalAssignments = activeDayCount * selectedIds.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Programı Ata
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">"{programName}"</span>{" "}
            programını sporculara atayın.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date picker */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              Başlangıç Tarihi
            </Label>
            <Input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="bg-background/50"
            />
          </div>

          {/* Day preview */}
          {!loadingPreview && activeDayCount > 0 && (
            <div className="glass rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Dumbbell className="w-4 h-4 text-primary" />
                {activeDayCount} aktif gün
              </div>
              <div className="flex flex-wrap gap-1.5">
                {dayLabels.map((label, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {label} — {addDays(scheduledDate, i).split("-").reverse().join(".")}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Athlete list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Sporcular</Label>
              {athletes.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={toggleAll}
                >
                  {selectedIds.length === athletes.length
                    ? "Hiçbirini Seçme"
                    : "Tümünü Seç"}
                </Button>
              )}
            </div>

            {athletesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : athletes.length === 0 ? (
              <div className="glass rounded-lg border border-border p-6 text-center">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Henüz bağlı sporcu yok
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[200px] rounded-lg border border-border">
                <div className="p-2 space-y-1">
                  {athletes.map((athlete) => {
                    const checked = selectedIds.includes(athlete.id);
                    return (
                      <label
                        key={athlete.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                          checked
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted/50 border border-transparent"
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleAthlete(athlete.id)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={athlete.avatar} />
                          <AvatarFallback className="text-xs bg-muted">
                            {getInitials(athlete.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {athlete.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {athlete.email}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {totalAssignments > 0 && (
            <p className="text-xs text-muted-foreground mr-auto">
              {activeDayCount} gün × {selectedIds.length} sporcu ={" "}
              <span className="font-semibold text-foreground">{totalAssignments} antrenman</span>
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              İptal
            </Button>
            <Button
              onClick={handleAssign}
              disabled={selectedIds.length === 0 || saving || activeDayCount === 0}
              className="bg-primary text-primary-foreground"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Users className="w-4 h-4 mr-1.5" />
              )}
              {selectedIds.length > 0
                ? `${totalAssignments} Antrenman Ata`
                : "Sporcu Seçin"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Json } from "@/integrations/supabase/types";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Loader2, Dumbbell, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAthletes } from "@/hooks/useAthletes";
import { addDays, format, startOfWeek } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const getNextMonday = () => {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 });
  return addDays(start, 7);
};

interface AssignProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  programName: string;
  /** Pre-select specific athlete IDs (used by ActiveBlocks "Replace" action) */
  preSelectedAthleteIds?: string[];
}

interface WeekConfigDay {
  label?: string;
  notes?: string;
  blockType?: string;
  groups?: Array<{ id: string; type?: string; exerciseIndices?: number[] }>;
}

interface ExerciseRow {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  rir: number | null;
  rir_per_set: number[] | null;
  failure_set: boolean | null;
  rest_time: string | null;
  notes: string | null;
  order_index: number | null;
  video_url: string | null;
}

const DAY_NAMES = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

const DURATION_OPTIONS = [
  { value: "1", label: "1 Hafta" },
  { value: "4", label: "4 Hafta (1 Ay)" },
  { value: "8", label: "8 Hafta (2 Ay)" },
  { value: "12", label: "12 Hafta (3 Ay)" },
];

export function AssignProgramDialog({
  open,
  onOpenChange,
  programId,
  programName,
  preSelectedAthleteIds,
}: AssignProgramDialogProps) {
  const { user } = useAuth();
  const { athletes, isLoading: athletesLoading } = useAthletes();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeDayCount, setActiveDayCount] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [activeDays, setActiveDays] = useState<Array<{ label: string; dayIdx: number }>>([]);
  const [startDate, setStartDate] = useState<Date>(getNextMonday());
  const [durationWeeks, setDurationWeeks] = useState(4);

  // Pre-select athletes when provided (e.g. from Replace action)
  useEffect(() => {
    if (open && preSelectedAthleteIds?.length) {
      setSelectedIds(preSelectedAthleteIds);
    }
  }, [open, preSelectedAthleteIds]);

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
      // Generate a unique batch ID for this assignment
      const batchId = crypto.randomUUID();

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

      // 2. Build "programDays" — only days with content
      type ProgramDay = {
        dayIdx: number;
        dayLabel: string;
        dayNotes: string;
        dayGroups: Array<{ id: string; type?: string; exerciseIndices?: number[] }>;
        exercises: ExerciseRow[];
      };

      const dayExercises: Record<number, ExerciseRow[]> = {};
      (exercises ?? []).forEach((ex) => {
        const dayIdx = Math.floor((ex.order_index ?? 0) / 100);
        if (!dayExercises[dayIdx]) dayExercises[dayIdx] = [];
        dayExercises[dayIdx].push(ex as ExerciseRow);
      });

      const programDays: ProgramDay[] = [];
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const cfg = weekConfig[dayIdx];
        const exs = dayExercises[dayIdx];
        const hasExercises = exs && exs.length > 0;
        const hasBlock = cfg?.blockType && cfg.blockType !== "none";
        if (!hasExercises && !hasBlock) continue;

        programDays.push({
          dayIdx,
          dayLabel: cfg?.label || `Gün ${dayIdx + 1}`,
          dayNotes: cfg?.notes || "",
          dayGroups: cfg?.groups || [],
          exercises: (exs ?? []).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
        });
      }

      if (programDays.length === 0) {
        toast.error("Bu programda atanacak aktif gün bulunamadı");
        setSaving(false);
        return;
      }

      // 3. CRITICAL OVERWRITE: Delete all future assignments for selected athletes
      const todayStr = format(new Date(), "yyyy-MM-dd");
      for (const athleteId of selectedIds) {
        await supabase
          .from("assigned_workouts")
          .delete()
          .eq("athlete_id", athleteId)
          .gte("scheduled_date", todayStr);
      }

      // 4. Build payload using modulo arithmetic for multi-week repetition
      const totalCalendarDays = durationWeeks * 7;
      const payload: Array<Record<string, unknown>> = [];

      for (let i = 0; i < totalCalendarDays; i++) {
        // Map this calendar day to a template day using modulo
        const calendarDayOfWeek = i % 7; // 0=Mon, 1=Tue, ...
        // Find matching programDay by dayIdx
        const templateDay = programDays.find((pd) => pd.dayIdx === calendarDayOfWeek);
        if (!templateDay) continue; // This calendar day is an off-day

        const targetDate = format(addDays(startDate, i), "yyyy-MM-dd");
        const dayName = DAY_NAMES[calendarDayOfWeek];

        const exercisesJson = templateDay.exercises.map((ex, exIdx) => {
          const foundGroup = templateDay.dayGroups.find(g =>
            g.exerciseIndices && g.exerciseIndices.includes(exIdx)
          );
          return {
            name: ex.name,
            sets: ex.sets ?? 3,
            reps: ex.reps ?? "10",
            rir: ex.rir ?? 2,
            rir_per_set: ex.rir_per_set ?? null,
            failure_set: ex.failure_set ?? false,
            rest_time: ex.rest_time ?? "",
            notes: ex.notes ?? "",
            order_index: (ex.order_index ?? 0) % 100,
            groupId: foundGroup?.id ?? null,
            video_url: ex.video_url ?? null,
          };
        });

        for (const athleteId of selectedIds) {
          payload.push({
            coach_id: user.id,
            athlete_id: athleteId,
            program_id: programId,
            scheduled_date: targetDate,
            day_of_week: dayName,
            workout_name: templateDay.dayLabel,
            day_notes: templateDay.dayNotes,
            exercises: exercisesJson as Json,
            status: "pending",
            assignment_batch_id: batchId,
          });
        }
      }

      if (payload.length === 0) {
        toast.error("Bu programda atanacak aktif gün bulunamadı");
        setSaving(false);
        return;
      }

      // 5. Insert in chunks (500 per batch to stay within Supabase limits)
      const CHUNK_SIZE = 500;
      for (let c = 0; c < payload.length; c += CHUNK_SIZE) {
        const chunk = payload.slice(c, c + CHUNK_SIZE);
        const { error } = await supabase.from("assigned_workouts").insert(chunk);
        if (error) throw error;
      }

      // 6. Set active_program_id on each athlete's profile + log assignment
      for (const athleteId of selectedIds) {
        await supabase
          .from("profiles")
          .update({ active_program_id: programId } as any)
          .eq("id", athleteId);

        await supabase.from("program_assignment_logs").insert({
          athlete_id: athleteId,
          coach_id: user.id,
          program_id: programId,
          program_title: programName,
          action: "assigned",
          assignment_batch_id: batchId,
        } as any);
      }

      toast.success(
        `${durationWeeks} haftalık program başarıyla atandı! (${payload.length} antrenman) 🚀`
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

  const totalAssignments = activeDayCount * selectedIds.length * durationWeeks;

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
          {/* Day preview */}
          {!loadingPreview && activeDayCount > 0 && (
            <div className="glass rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Dumbbell className="w-4 h-4 text-primary" />
                {activeDayCount} aktif gün / hafta
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeDays.map((day, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {day.label} — {DAY_NAMES[day.dayIdx]}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Duration Selector */}
          <div className="space-y-1.5">
            <Label className="text-sm">Atama Süresi</Label>
            <Select
              value={String(durationWeeks)}
              onValueChange={(v) => setDurationWeeks(Number(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date Picker */}
          <div className="space-y-1.5">
            <Label className="text-sm">Başlangıç Tarihi (Pazartesi)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(startDate, "d MMMM yyyy, EEEE", { locale: tr })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(startOfWeek(date, { weekStartsOn: 1 }))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <p className="text-[10px] text-muted-foreground">
              Seçtiğiniz tarih haftanın Pazartesi gününe yuvarlanır
            </p>
          </div>

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
              {activeDayCount} gün × {selectedIds.length} sporcu × {durationWeeks} hafta ={" "}
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

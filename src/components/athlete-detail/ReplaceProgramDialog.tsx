import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
import { CalendarIcon, Loader2, Dumbbell, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addDays, format, startOfWeek } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Json } from "@/integrations/supabase/types";

interface ReplaceProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: string;
  oldProgramId: string;
  oldProgramName: string;
  onComplete: () => void;
}

interface ProgramOption {
  id: string;
  title: string;
  description: string | null;
  difficulty: string | null;
  activeDayCount: number;
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

const getNextMonday = () => {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 });
  return addDays(start, 7);
};

export function ReplaceProgramDialog({
  open,
  onOpenChange,
  athleteId,
  oldProgramId,
  oldProgramName,
  onComplete,
}: ReplaceProgramDialogProps) {
  const { user, activeCoachId } = useAuth();
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(getNextMonday());
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [saving, setSaving] = useState(false);

  // Fetch coach programs
  useEffect(() => {
    if (!open || !user || !activeCoachId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { data: progs } = await supabase
        .from("programs")
        .select("id, title, description, difficulty")
        .eq("coach_id", activeCoachId)
        .eq("is_template", true)
        .order("title");

      if (cancelled || !progs) { setLoading(false); return; }

      // Get active day counts for each program
      const withCounts: ProgramOption[] = await Promise.all(
        progs.map(async (p) => {
          const [{ data: exercises }, { data: program }] = await Promise.all([
            supabase.from("exercises").select("order_index").eq("program_id", p.id),
            supabase.from("programs").select("week_config").eq("id", p.id).single(),
          ]);
          const weekConfig: WeekConfigDay[] = Array.isArray(program?.week_config) ? (program.week_config as WeekConfigDay[]) : [];
          const daysWithExercises = new Set<number>();
          (exercises ?? []).forEach((ex) => daysWithExercises.add(Math.floor((ex.order_index ?? 0) / 100)));
          let count = 0;
          for (let i = 0; i < 7; i++) {
            const cfg = weekConfig[i];
            if (daysWithExercises.has(i) || (cfg?.blockType && cfg.blockType !== "none")) count++;
          }
          return { id: p.id, title: p.title, description: p.description, difficulty: p.difficulty, activeDayCount: count };
        })
      );

      if (!cancelled) {
        setPrograms(withCounts);
        setSelectedProgramId("");
        setStartDate(getNextMonday());
        setDurationWeeks(4);
      }
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [open, user]);

  const selectedProgram = programs.find((p) => p.id === selectedProgramId);
  const totalWorkouts = selectedProgram ? selectedProgram.activeDayCount * durationWeeks : 0;

  const handleReplace = async () => {
    if (!user || !activeCoachId || !selectedProgramId || !selectedProgram) return;
    setSaving(true);

    try {
      const batchId = crypto.randomUUID();
      const todayStr = format(new Date(), "yyyy-MM-dd");

      // 1. Delete ONLY the old program's future workouts (program-scoped)
      await supabase
        .from("assigned_workouts")
        .delete()
        .eq("athlete_id", athleteId)
        .eq("program_id", oldProgramId)
        .gte("scheduled_date", todayStr);

      // 2. Log removal of old program
      await supabase.from("program_assignment_logs").insert({
        athlete_id: athleteId,
        coach_id: activeCoachId,
        program_id: oldProgramId,
        program_title: oldProgramName,
        action: "removed",
      });

      // 3. Fetch new program structure
      const [{ data: exercises, error: exErr }, { data: program, error: pErr }] = await Promise.all([
        supabase.from("exercises").select("*").eq("program_id", selectedProgramId),
        supabase.from("programs").select("week_config").eq("id", selectedProgramId).single(),
      ]);

      if (exErr || pErr) throw new Error(exErr?.message || pErr?.message);

      const weekConfig: WeekConfigDay[] = Array.isArray(program?.week_config) ? (program.week_config as WeekConfigDay[]) : [];

      // Build program days
      const dayExercises: Record<number, ExerciseRow[]> = {};
      (exercises ?? []).forEach((ex) => {
        const dayIdx = Math.floor((ex.order_index ?? 0) / 100);
        if (!dayExercises[dayIdx]) dayExercises[dayIdx] = [];
        dayExercises[dayIdx].push(ex as ExerciseRow);
      });

      type ProgramDay = {
        dayIdx: number;
        dayLabel: string;
        dayNotes: string;
        dayGroups: Array<{ id: string; type?: string; exerciseIndices?: number[] }>;
        exercises: ExerciseRow[];
      };

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
        toast.error("Seçilen programda atanacak aktif gün bulunamadı");
        setSaving(false);
        return;
      }

      // 4. Build payload with modulo arithmetic
      const totalCalendarDays = durationWeeks * 7;
      const payload: Array<Record<string, unknown>> = [];

      for (let i = 0; i < totalCalendarDays; i++) {
        const calendarDayOfWeek = i % 7;
        const templateDay = programDays.find((pd) => pd.dayIdx === calendarDayOfWeek);
        if (!templateDay) continue;

        const targetDate = format(addDays(startDate, i), "yyyy-MM-dd");
        const dayName = DAY_NAMES[calendarDayOfWeek];

        const exercisesJson = templateDay.exercises.map((ex, exIdx) => {
          const foundGroup = templateDay.dayGroups.find((g) => g.exerciseIndices && g.exerciseIndices.includes(exIdx));
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

        payload.push({
          coach_id: activeCoachId,
          athlete_id: athleteId,
          program_id: selectedProgramId,
          scheduled_date: targetDate,
          day_of_week: dayName,
          workout_name: templateDay.dayLabel,
          day_notes: templateDay.dayNotes,
          exercises: exercisesJson as Json,
          status: "pending",
          assignment_batch_id: batchId,
        });
      }

      if (payload.length === 0) {
        toast.error("Bu programda atanacak aktif gün bulunamadı");
        setSaving(false);
        return;
      }

      // 5. Insert in chunks
      const CHUNK_SIZE = 500;
      for (let c = 0; c < payload.length; c += CHUNK_SIZE) {
        const chunk = payload.slice(c, c + CHUNK_SIZE);
        const { error } = await supabase.from("assigned_workouts").insert(chunk as any);
        if (error) throw error;
      }

      // 6. Update active_program_id + log assignment
      await supabase.from("profiles").update({ active_program_id: selectedProgramId } as any).eq("id", athleteId);
      await supabase.from("program_assignment_logs").insert({
        athlete_id: athleteId,
        coach_id: activeCoachId,
        program_id: selectedProgramId,
        program_title: selectedProgram.title,
        action: "assigned",
        assignment_batch_id: batchId,
      });

      toast.success(`"${selectedProgram.title}" programı başarıyla atandı`);
      onOpenChange(false);
      onComplete();
    } catch (err: any) {
      toast.error("Hata: " + (err.message || "Program değiştirilemedi"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-primary" />
            Programı Değiştir
          </DialogTitle>
          <DialogDescription>
            Mevcut programı kaldırıp yeni bir program atayın
          </DialogDescription>
        </DialogHeader>

        {/* Current program badge */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">Mevcut:</span>
          <Badge variant="secondary" className="text-xs">{oldProgramName}</Badge>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
          {selectedProgram ? (
            <Badge className="text-xs bg-primary/15 text-primary border-primary/20">{selectedProgram.title}</Badge>
          ) : (
            <span className="text-xs text-muted-foreground italic">Seçilmedi</span>
          )}
        </div>

        <Separator />

        {/* Program list */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Yeni Program Seç</Label>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <ScrollArea className="max-h-[200px]">
              <RadioGroup value={selectedProgramId} onValueChange={setSelectedProgramId} className="space-y-1">
                {programs.filter((p) => p.id !== oldProgramId).map((p) => (
                  <label
                    key={p.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                      selectedProgramId === p.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30 hover:bg-secondary/30"
                    )}
                  >
                    <RadioGroupItem value={p.id} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                      {p.description && (
                        <p className="text-[11px] text-muted-foreground truncate">{p.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {p.difficulty && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{p.difficulty}</Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{p.activeDayCount} gün</Badge>
                    </div>
                  </label>
                ))}
                {programs.filter((p) => p.id !== oldProgramId).length === 0 && !loading && (
                  <p className="text-sm text-muted-foreground text-center py-4">Başka program bulunamadı</p>
                )}
              </RadioGroup>
            </ScrollArea>
          )}
        </div>

        <Separator />

        {/* Date & Duration */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Başlangıç</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left text-sm h-9">
                  <CalendarIcon className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  {format(startDate, "d MMM yyyy", { locale: tr })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(d) => d && setStartDate(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Süre</Label>
            <Select value={String(durationWeeks)} onValueChange={(v) => setDurationWeeks(Number(v))}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary */}
        {selectedProgram && (
          <div className="rounded-lg bg-secondary/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{selectedProgram.activeDayCount}</span> gün/hafta ·{" "}
              <span className="font-semibold text-foreground">{durationWeeks}</span> hafta ·{" "}
              <span className="font-semibold text-foreground">{totalWorkouts}</span> antrenman
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={handleReplace}
            disabled={!selectedProgramId || saving}
            className="w-full"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Programı Değiştir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

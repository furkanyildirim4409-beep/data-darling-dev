import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Loader2, Dumbbell, Check, CalendarIcon, X, Clock, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ProgramOption {
  id: string;
  title: string;
  description: string | null;
  spotifyUrl: string | null;
  exerciseCount: number;
  dayCount: number;
}

interface AssignTrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: string;
  onAssigned: () => void;
}

const DURATION_OPTIONS = [
  { value: "1", label: "1 Hafta" },
  { value: "4", label: "4 Hafta" },
  { value: "8", label: "8 Hafta" },
  { value: "12", label: "12 Hafta" },
];

function normalizeToMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getNextMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return normalizeToMonday(d);
}

const DAY_LABELS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export function AssignTrainingDialog({ open, onOpenChange, athleteId, onAssigned }: AssignTrainingDialogProps) {
  const { user, activeCoachId } = useAuth();
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(getNextMonday());
  const [durationWeeks, setDurationWeeks] = useState("4");
  const [previewProgram, setPreviewProgram] = useState<ProgramOption | null>(null);
  const [previewExercises, setPreviewExercises] = useState<Record<string, any[]>>({});
  const [previewLoading, setPreviewLoading] = useState(false);

  const openPreview = async (prog: ProgramOption) => {
    setPreviewProgram(prog);
    if (previewExercises[prog.id]) return;
    setPreviewLoading(true);
    const { data } = await supabase
      .from("exercises")
      .select("name, sets, reps, rir, rest_time, notes, order_index")
      .eq("program_id", prog.id)
      .order("order_index");
    setPreviewExercises((prev) => ({ ...prev, [prog.id]: data ?? [] }));
    setPreviewLoading(false);
  };

  useEffect(() => {
    if (!open || !user || !activeCoachId) return;
    setStartDate(getNextMonday());
    setDurationWeeks("4");
    (async () => {
      setLoading(true);
      const { data: progs } = await supabase
        .from("programs")
        .select("id, title, description, spotify_url")
        .eq("coach_id", activeCoachId)
        .eq("is_template", true)
        .order("created_at", { ascending: false });

      if (!progs?.length) {
        setPrograms([]);
        setLoading(false);
        return;
      }

      const { data: exercises } = await supabase
        .from("exercises")
        .select("program_id, order_index")
        .in("program_id", progs.map((p) => p.id));

      const mapped: ProgramOption[] = progs.map((p) => {
        const exs = (exercises || []).filter((e) => e.program_id === p.id);
        const days = new Set(exs.map((e) => Math.floor((e.order_index || 0) / 100)));
        return {
          id: p.id,
          title: p.title,
          description: p.description,
          spotifyUrl: (p as any).spotify_url ?? null,
          exerciseCount: exs.length,
          dayCount: days.size,
        };
      });
      setPrograms(mapped);
      setLoading(false);
    })();
  }, [open, user]);

  const handleAssign = async (prog: ProgramOption) => {
    if (!user || !activeCoachId) return;
    setAssigning(prog.id);

    // Fetch exercises grouped by day
    const { data: exercises } = await supabase
      .from("exercises")
      .select("name, sets, reps, rir, rir_per_set, failure_set, notes, rest_time, video_url, order_index")
      .eq("program_id", prog.id)
      .order("order_index");

    if (!exercises?.length) {
      toast({ title: "Hata", description: "Bu programda egzersiz bulunamadı.", variant: "destructive" });
      setAssigning(null);
      return;
    }

    // Group exercises by day
    const dayMap = new Map<number, typeof exercises>();
    exercises.forEach((ex) => {
      const dayIdx = Math.floor((ex.order_index || 0) / 100);
      if (!dayMap.has(dayIdx)) dayMap.set(dayIdx, []);
      dayMap.get(dayIdx)!.push(ex);
    });

    const batchId = crypto.randomUUID();
    const weeks = Number(durationWeeks);
    const start = normalizeToMonday(new Date(startDate));
    const rows: any[] = [];

    for (let w = 0; w < weeks; w++) {
      dayMap.forEach((dayExercises, dayIdx) => {
        const dayOfWeek = DAY_LABELS[dayIdx % 7] || DAY_LABELS[0];
        const dayOffset = dayIdx % 7;
        const scheduledDate = new Date(start);
        scheduledDate.setDate(start.getDate() + w * 7 + dayOffset);

        rows.push({
          athlete_id: athleteId,
          coach_id: activeCoachId,
          program_id: prog.id,
          assignment_batch_id: batchId,
          workout_name: `${prog.title} — ${dayOfWeek}`,
          day_of_week: dayOfWeek,
          scheduled_date: format(scheduledDate, "yyyy-MM-dd"),
          exercises: dayExercises.map((e) => ({
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            rir: e.rir,
            rir_per_set: e.rir_per_set,
            failure_set: e.failure_set,
            notes: e.notes,
            rest_time: e.rest_time,
            video_url: e.video_url,
          })),
          status: "pending",
          spotify_url: prog.spotifyUrl ?? null,
        });
      });
    }

    const { error } = await supabase.from("assigned_workouts").insert(rows);
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
      setAssigning(null);
      return;
    }

    // Update active_program_id
    await supabase.from("profiles").update({ active_program_id: prog.id } as any).eq("id", athleteId);

    // Log assignment
    await supabase.from("program_assignment_logs").insert({
      athlete_id: athleteId,
      coach_id: activeCoachId,
      program_id: prog.id,
      program_title: prog.title,
      assignment_batch_id: batchId,
      action: "assigned",
    });

    toast({ title: "Başarılı", description: `"${prog.title}" programı atandı!` });
    onAssigned();
    onOpenChange(false);
    setAssigning(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-primary" />
            Antrenman Programı Ata
          </DialogTitle>
          <DialogDescription>
            Bir antrenman programı seçerek sporcuya atayın.
          </DialogDescription>
        </DialogHeader>

        {/* Date & Duration */}
        <div className="space-y-2 pb-2 border-b border-border">
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal gap-2")}>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {format(startDate, "dd MMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(d) => d && setStartDate(normalizeToMonday(d))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Select value={durationWeeks} onValueChange={setDurationWeeks}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Seçilen Hafta Başlangıcı: <span className="font-medium text-foreground">{format(startDate, "dd MMMM yyyy", { locale: tr })}</span> (Pazartesi)
          </p>
        </div>
        <ScrollArea className="h-[440px] max-h-[50vh] w-full pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : programs.length === 0 ? (
            <div className="text-center py-12">
              <Dumbbell className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Henüz antrenman programı oluşturmadınız.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 pb-4">
              {programs.map((prog) => (
                <div
                  key={prog.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openPreview(prog)}
                  onKeyDown={(e) => { if (e.key === "Enter") openPreview(prog); }}
                  className="rounded-xl border border-border hover:border-primary/40 p-4 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-foreground">{prog.title}</h4>
                      {prog.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{prog.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {prog.dayCount} gün
                      </Badge>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {prog.exerciseCount} hareket
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => { e.stopPropagation(); openPreview(prog); }}
                    >
                      <Eye className="w-4 h-4 mr-1.5" />
                      Önizleme
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={assigning === prog.id}
                      onClick={(e) => { e.stopPropagation(); handleAssign(prog); }}
                    >
                      {assigning === prog.id ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-1.5" />
                      )}
                      Ata
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>

      <Sheet open={!!previewProgram} onOpenChange={(o) => !o && setPreviewProgram(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-5 py-4 border-b border-border flex flex-row items-center justify-between space-y-0">
            <div className="min-w-0">
              <SheetTitle className="truncate flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-primary" />
                {previewProgram?.title}
              </SheetTitle>
              {previewProgram?.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{previewProgram.description}</p>
              )}
            </div>
            <SheetClose className="rounded-md p-1 hover:bg-muted">
              <X className="w-4 h-4" />
            </SheetClose>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {previewLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : previewProgram && (previewExercises[previewProgram.id]?.length ?? 0) === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">Bu programda egzersiz yok.</p>
            ) : previewProgram && (() => {
              const exs = previewExercises[previewProgram.id] ?? [];
              const byDay = new Map<number, any[]>();
              exs.forEach((ex) => {
                const day = Math.floor((ex.order_index || 0) / 100);
                if (!byDay.has(day)) byDay.set(day, []);
                byDay.get(day)!.push(ex);
              });
              return [...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([day, items]) => (
                <div key={day} className="space-y-2">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {DAY_LABELS[day % 7] ?? `Gün ${day + 1}`}
                  </h5>
                  <div className="space-y-2">
                    {items.map((ex, i) => (
                      <div key={i} className="rounded-lg border border-border p-3 bg-card">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm text-foreground flex-1">{ex.name}</p>
                          {typeof ex.rir === "number" && (
                            <Badge variant="outline" className="text-[10px] shrink-0">RIR {ex.rir}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="font-mono">{ex.sets ?? "-"} x {ex.reps ?? "-"}</span>
                          {ex.rest_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {ex.rest_time}
                            </span>
                          )}
                        </div>
                        {ex.notes && (
                          <p className="text-xs text-muted-foreground mt-1.5 italic">{ex.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </SheetContent>
      </Sheet>
    </Dialog>
  );
}

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
import { Users, Loader2, Dumbbell, Search, Layers } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAthletes } from "@/hooks/useAthletes";
import { cn } from "@/lib/utils";

interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const DAY_NAMES = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export function BulkAssignDialog({ open, onOpenChange }: BulkAssignDialogProps) {
  const { user } = useAuth();
  const { athletes, isLoading: athletesLoading } = useAthletes();

  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [programSearch, setProgramSearch] = useState("");
  const [athleteSearch, setAthleteSearch] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  // Fetch all programs with active day counts
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;

    const load = async () => {
      setLoadingPrograms(true);
      const { data, error } = await supabase
        .from("programs")
        .select("id, title, description, difficulty, week_config")
        .eq("coach_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled || error) {
        setLoadingPrograms(false);
        return;
      }

      // Also fetch exercise counts per program
      const { data: exercises } = await supabase
        .from("exercises")
        .select("program_id, order_index")
        .in("program_id", (data ?? []).map(p => p.id));

      if (cancelled) return;

      const exercisesByProgram = new Map<string, Set<number>>();
      (exercises ?? []).forEach(ex => {
        const dayIdx = Math.floor((ex.order_index ?? 0) / 100);
        if (!exercisesByProgram.has(ex.program_id!)) {
          exercisesByProgram.set(ex.program_id!, new Set());
        }
        exercisesByProgram.get(ex.program_id!)!.add(dayIdx);
      });

      setPrograms((data ?? []).map(p => {
        const weekConfig: WeekConfigDay[] = Array.isArray(p.week_config) ? (p.week_config as WeekConfigDay[]) : [];
        const exDays = exercisesByProgram.get(p.id) ?? new Set();
        let activeDayCount = 0;
        for (let i = 0; i < 7; i++) {
          const cfg = weekConfig[i];
          if (exDays.has(i) || (cfg?.blockType && cfg.blockType !== "none")) {
            activeDayCount++;
          }
        }
        return {
          id: p.id,
          title: p.title,
          description: p.description,
          difficulty: p.difficulty,
          activeDayCount,
        };
      }));
      setLoadingPrograms(false);
    };

    load();
    return () => { cancelled = true; };
  }, [open, user]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSelectedProgramIds([]);
      setSelectedAthleteIds([]);
      setProgramSearch("");
      setAthleteSearch("");
      setStep(1);
    }
  }, [open]);

  const toggleProgram = (id: string) =>
    setSelectedProgramIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleAthlete = (id: string) =>
    setSelectedAthleteIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleAllPrograms = () => {
    const filtered = filteredPrograms.map(p => p.id);
    const allSelected = filtered.every(id => selectedProgramIds.includes(id));
    setSelectedProgramIds(prev =>
      allSelected ? prev.filter(id => !filtered.includes(id)) : [...new Set([...prev, ...filtered])]
    );
  };

  const toggleAllAthletes = () => {
    const filtered = filteredAthletes.map(a => a.id);
    const allSelected = filtered.every(id => selectedAthleteIds.includes(id));
    setSelectedAthleteIds(prev =>
      allSelected ? prev.filter(id => !filtered.includes(id)) : [...new Set([...prev, ...filtered])]
    );
  };

  const filteredPrograms = programs.filter(p =>
    p.title.toLowerCase().includes(programSearch.toLowerCase())
  );

  const filteredAthletes = athletes.filter(a =>
    a.name.toLowerCase().includes(athleteSearch.toLowerCase()) ||
    a.email.toLowerCase().includes(athleteSearch.toLowerCase())
  );

  const totalDays = selectedProgramIds.reduce((sum, id) => {
    const prog = programs.find(p => p.id === id);
    return sum + (prog?.activeDayCount ?? 0);
  }, 0);

  const totalAssignments = totalDays * selectedAthleteIds.length;

  const handleAssign = async () => {
    if (!user || selectedProgramIds.length === 0 || selectedAthleteIds.length === 0) return;
    setSaving(true);

    try {
      // Fetch all exercises and configs for selected programs in parallel
      const [{ data: allExercises }, { data: allPrograms }] = await Promise.all([
        supabase.from("exercises").select("*").in("program_id", selectedProgramIds),
        supabase.from("programs").select("id, week_config").in("id", selectedProgramIds),
      ]);

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

      for (const programId of selectedProgramIds) {
        const progData = allPrograms?.find(p => p.id === programId);
        const weekConfig: WeekConfigDay[] = Array.isArray(progData?.week_config)
          ? (progData.week_config as WeekConfigDay[])
          : [];

        const progExercises = (allExercises ?? []).filter(ex => ex.program_id === programId);
        const dayExercises: Record<number, typeof progExercises> = {};
        progExercises.forEach(ex => {
          const dayIdx = Math.floor((ex.order_index ?? 0) / 100);
          if (!dayExercises[dayIdx]) dayExercises[dayIdx] = [];
          dayExercises[dayIdx].push(ex);
        });

        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
          const cfg = weekConfig[dayIdx];
          const exs = dayExercises[dayIdx];
          const hasExercises = exs && exs.length > 0;
          const hasBlock = cfg?.blockType && cfg.blockType !== "none";
          if (!hasExercises && !hasBlock) continue;

          const dayLabel = cfg?.label || `Gün ${dayIdx + 1}`;
          const dayNotes = cfg?.notes || "";
          const targetDate = addDays(scheduledDate, dayIdx);
          const dayGroups = cfg?.groups || [];

          const sortedExercises = (exs ?? []).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

          const exercisesJson = sortedExercises.map((ex, exIdx) => {
            const foundGroup = dayGroups.find(g =>
              g.exerciseIndices && g.exerciseIndices.includes(exIdx)
            );
            return {
              name: ex.name,
              sets: ex.sets ?? 3,
              reps: ex.reps ?? "10",
              rir: (ex as any).rir ?? 2,
              failure_set: (ex as any).failure_set ?? false,
              rest_time: ex.rest_time ?? "",
              notes: ex.notes ?? "",
              order_index: (ex.order_index ?? 0) % 100,
              groupId: foundGroup?.id ?? null,
            };
          });

          for (const athleteId of selectedAthleteIds) {
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
      }

      if (payload.length === 0) {
        toast.error("Seçilen programlarda atanacak aktif gün bulunamadı");
        setSaving(false);
        return;
      }

      // Batch insert in chunks of 500 to avoid payload limits
      const chunkSize = 500;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        const { error } = await supabase.from("assigned_workouts").insert(chunk);
        if (error) throw error;
      }

      toast.success(
        `${selectedProgramIds.length} program × ${selectedAthleteIds.length} sporcu = ${payload.length} antrenman atandı! 🚀`
      );
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Bilinmeyen hata";
      toast.error("Toplu atama başarısız: " + message);
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const getDifficultyLabel = (d: string | null) => {
    if (d === "beginner") return "Başlangıç";
    if (d === "intermediate") return "Orta";
    if (d === "advanced") return "İleri";
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-card border-border max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Toplu Program Atama
          </DialogTitle>
          <DialogDescription>
            Birden fazla programı birden fazla sporcuya aynı anda atayın.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-1">
          <button
            onClick={() => setStep(1)}
            className={cn(
              "flex-1 text-center py-2 rounded-lg text-sm font-medium transition-colors",
              step === 1 ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            <Dumbbell className="w-4 h-4 inline mr-1.5" />
            Programlar ({selectedProgramIds.length})
          </button>
          <button
            onClick={() => setStep(2)}
            className={cn(
              "flex-1 text-center py-2 rounded-lg text-sm font-medium transition-colors",
              step === 2 ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            <Users className="w-4 h-4 inline mr-1.5" />
            Sporcular ({selectedAthleteIds.length})
          </button>
        </div>

        <div className="flex-1 overflow-hidden space-y-3">
          {step === 1 && (
            <>
              {/* Program search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Program ara..."
                  value={programSearch}
                  onChange={(e) => setProgramSearch(e.target.value)}
                  className="pl-9 bg-background/50 border-border"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">{programs.length} program</Label>
                {filteredPrograms.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-6" onClick={toggleAllPrograms}>
                    {filteredPrograms.every(p => selectedProgramIds.includes(p.id)) ? "Seçimi Kaldır" : "Tümünü Seç"}
                  </Button>
                )}
              </div>

              {loadingPrograms ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="h-[280px] rounded-lg border border-border">
                  <div className="p-2 space-y-1">
                    {filteredPrograms.map(prog => {
                      const checked = selectedProgramIds.includes(prog.id);
                      const diffLabel = getDifficultyLabel(prog.difficulty);
                      return (
                        <label
                          key={prog.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border",
                            checked
                              ? "bg-primary/10 border-primary/30"
                              : "hover:bg-muted/50 border-transparent"
                          )}
                        >
                          <Checkbox checked={checked} onCheckedChange={() => toggleProgram(prog.id)} />
                          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                            <Dumbbell className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{prog.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">{prog.activeDayCount} gün</span>
                              {diffLabel && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-border">
                                  {diffLabel}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                    {filteredPrograms.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">Program bulunamadı</p>
                    )}
                  </div>
                </ScrollArea>
              )}
            </>
          )}

          {step === 2 && (
            <>
              {/* Date picker */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm">
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

              {/* Athlete search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Sporcu ara..."
                  value={athleteSearch}
                  onChange={(e) => setAthleteSearch(e.target.value)}
                  className="pl-9 bg-background/50 border-border"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">{athletes.length} sporcu</Label>
                {filteredAthletes.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-6" onClick={toggleAllAthletes}>
                    {filteredAthletes.every(a => selectedAthleteIds.includes(a.id)) ? "Seçimi Kaldır" : "Tümünü Seç"}
                  </Button>
                )}
              </div>

              {athletesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : athletes.length === 0 ? (
                <div className="glass rounded-lg border border-border p-6 text-center">
                  <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Henüz bağlı sporcu yok</p>
                </div>
              ) : (
                <ScrollArea className="h-[220px] rounded-lg border border-border">
                  <div className="p-2 space-y-1">
                    {filteredAthletes.map(athlete => {
                      const checked = selectedAthleteIds.includes(athlete.id);
                      return (
                        <label
                          key={athlete.id}
                          className={cn(
                            "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors border",
                            checked
                              ? "bg-primary/10 border-primary/30"
                              : "hover:bg-muted/50 border-transparent"
                          )}
                        >
                          <Checkbox checked={checked} onCheckedChange={() => toggleAthlete(athlete.id)} />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={athlete.avatar} />
                            <AvatarFallback className="text-xs bg-muted">
                              {getInitials(athlete.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{athlete.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{athlete.email}</p>
                          </div>
                        </label>
                      );
                    })}
                    {filteredAthletes.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">Sporcu bulunamadı</p>
                    )}
                  </div>
                </ScrollArea>
              )}
            </>
          )}
        </div>

        {/* Summary bar */}
        {(selectedProgramIds.length > 0 || selectedAthleteIds.length > 0) && (
          <div className="glass rounded-lg border border-border p-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  <Dumbbell className="w-3.5 h-3.5 inline mr-1" />
                  {selectedProgramIds.length} program
                </span>
                <span className="text-muted-foreground">×</span>
                <span className="text-muted-foreground">
                  <Users className="w-3.5 h-3.5 inline mr-1" />
                  {selectedAthleteIds.length} sporcu
                </span>
              </div>
              {totalAssignments > 0 && (
                <Badge className="bg-primary/15 text-primary border-primary/30">
                  {totalAssignments} antrenman
                </Badge>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              İptal
            </Button>
            {step === 1 ? (
              <Button
                onClick={() => setStep(2)}
                disabled={selectedProgramIds.length === 0}
                className="flex-1 sm:flex-none bg-primary text-primary-foreground"
              >
                Devam — Sporcu Seç
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep(1)} disabled={saving}>
                  Geri
                </Button>
                <Button
                  onClick={handleAssign}
                  disabled={selectedAthleteIds.length === 0 || selectedProgramIds.length === 0 || saving}
                  className="flex-1 sm:flex-none bg-primary text-primary-foreground"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Layers className="w-4 h-4 mr-1.5" />
                  )}
                  {totalAssignments > 0
                    ? `${totalAssignments} Antrenman Ata`
                    : "Sporcu Seçin"}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

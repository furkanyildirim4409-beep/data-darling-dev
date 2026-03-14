import { useState, useEffect, useCallback, useRef } from "react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dumbbell, Calendar, Clock, StickyNote, Zap, Loader2, Trash2, History, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExerciseJson {
  name: string;
  sets?: number;
  reps?: string;
  rir?: number;
  failure_set?: boolean;
  rest_time?: string;
  notes?: string;
  video_url?: string;
}

interface AssignedWorkout {
  id: string;
  workout_name: string;
  day_notes: string | null;
  day_of_week: string | null;
  scheduled_date: string | null;
  status: string | null;
  program_id: string | null;
  exercises: ExerciseJson[];
}

/** Lightweight workout row — no exercises JSON */
interface LightWorkout {
  id: string;
  workout_name: string;
  day_of_week: string | null;
  scheduled_date: string | null;
  status: string | null;
}

const DAY_NAMES = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const HISTORY_PAGE_SIZE = 20;
const EXPAND_PAGE_SIZE = 15;

interface ProgramInfo {
  id: string;
  title: string;
  difficulty: string | null;
  target_goal: string | null;
  description: string | null;
  week_config: any;
  assigned_at: string | null;
  active_day_count: number;
}

interface AssignmentLog {
  id: string;
  program_id: string;
  program_title: string;
  action: string;
  created_at: string;
  coach_id: string;
  assignment_batch_id: string | null;
}

interface ExpandedLogCache {
  workouts: LightWorkout[];
  page: number;
  hasMore: boolean;
  loading: boolean;
}

interface ProgramTabProps {
  athleteId: string;
  currentProgram: string;
}

export function ProgramTab({ athleteId }: ProgramTabProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [allPrograms, setAllPrograms] = useState<ProgramInfo[]>([]);
  const [activeProgramId, setActiveProgramId] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<AssignedWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [previewExercise, setPreviewExercise] = useState<ExerciseJson | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<AssignmentLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const historyPageRef = useRef(0);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [expandedCache, setExpandedCache] = useState<Record<string, ExpandedLogCache>>({});
  const expandRequestRef = useRef(0);

  // Fetch all programs assigned to this athlete
  const fetchPrograms = useCallback(async () => {
    setLoading(true);

    // 1. Get active_program_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("active_program_id")
      .eq("id", athleteId)
      .single();

    const apId = (profile as any)?.active_program_id as string | null;
    setActiveProgramId(apId);

    // 2. Get all distinct program_ids from assigned_workouts for this athlete
    const { data: assignments } = await supabase
      .from("assigned_workouts")
      .select("program_id, day_of_week")
      .eq("athlete_id", athleteId)
      .not("program_id", "is", null);

    const uniqueProgramIds = [...new Set((assignments ?? []).map(a => a.program_id).filter(Boolean))] as string[];

    if (uniqueProgramIds.length === 0) {
      setAllPrograms([]);
      setWorkouts([]);
      setSelectedProgramId(null);
      setLoading(false);
      return;
    }

    // 3. Fetch program info for all
    const [programsRes, logsRes] = await Promise.all([
      supabase.from("programs").select("id, title, difficulty, target_goal, description, week_config").in("id", uniqueProgramIds),
      supabase.from("program_assignment_logs").select("program_id, created_at").eq("athlete_id", athleteId).eq("action", "assigned").order("created_at", { ascending: false }),
    ]);

    const assignmentDates: Record<string, string> = {};
    (logsRes.data ?? []).forEach((log: any) => {
      if (log.program_id && !assignmentDates[log.program_id]) {
        assignmentDates[log.program_id] = log.created_at;
      }
    });

    // Count active (non-off) days per program from assigned_workouts
    const dayCountByProgram: Record<string, Set<string>> = {};
    (assignments ?? []).forEach((a: any) => {
      if (a.program_id && a.day_of_week) {
        if (!dayCountByProgram[a.program_id]) dayCountByProgram[a.program_id] = new Set();
        dayCountByProgram[a.program_id].add(a.day_of_week);
      }
    });

    const programList = (programsRes.data ?? []).map((p: any) => ({
      ...p,
      assigned_at: assignmentDates[p.id] || null,
      active_day_count: dayCountByProgram[p.id]?.size || 0,
    })) as ProgramInfo[];
    setAllPrograms(programList);

    // Auto-select active program, or first available
    const initialSelection = apId && uniqueProgramIds.includes(apId) ? apId : uniqueProgramIds[0];
    setSelectedProgramId(initialSelection);

    setLoading(false);
  }, [athleteId]);

  // Fetch workouts for selected program
  const fetchWorkoutsForProgram = useCallback(async (programId: string) => {
    setLoadingWorkouts(true);

    const { data } = await supabase
      .from("assigned_workouts")
      .select("id, workout_name, day_notes, day_of_week, scheduled_date, status, program_id, exercises")
      .eq("athlete_id", athleteId)
      .eq("program_id", programId);

    const mapped = (data ?? []).map((d) => ({
      ...d,
      day_notes: (d as any).day_notes ?? null,
      day_of_week: (d as any).day_of_week ?? null,
      exercises: Array.isArray(d.exercises) ? (d.exercises as unknown as ExerciseJson[]) : [],
    }));

    mapped.sort((a, b) => {
      const aIdx = a.day_of_week ? DAY_NAMES.indexOf(a.day_of_week) : 99;
      const bIdx = b.day_of_week ? DAY_NAMES.indexOf(b.day_of_week) : 99;
      return aIdx - bIdx;
    });

    // Deduplicate by day_of_week — show only 1 week template preview
    const seenDays = new Set<string>();
    const uniqueWeek = mapped.filter((w) => {
      const key = w.day_of_week || w.id;
      if (seenDays.has(key)) return false;
      seenDays.add(key);
      return true;
    });

    setWorkouts(uniqueWeek);
    setLoadingWorkouts(false);
  }, [athleteId]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  useEffect(() => {
    if (selectedProgramId) {
      fetchWorkoutsForProgram(selectedProgramId);
    }
  }, [selectedProgramId, fetchWorkoutsForProgram]);

  const handleRemoveProgram = async () => {
    if (!selectedProgramId || !user) return;
    setRemoving(true);

    const programTitle = allPrograms.find(p => p.id === selectedProgramId)?.title ?? "Bilinmeyen";

    // 1. Only clear active_program_id if removing the active one
    if (selectedProgramId === activeProgramId) {
      await supabase
        .from("profiles")
        .update({ active_program_id: null } as any)
        .eq("id", athleteId);
      setActiveProgramId(null);
    }

    // 2. Delete assigned_workouts for this program+athlete
    await supabase
      .from("assigned_workouts")
      .delete()
      .eq("athlete_id", athleteId)
      .eq("program_id", selectedProgramId);

    // 3. Log the removal
    await supabase.from("program_assignment_logs").insert({
      athlete_id: athleteId,
      coach_id: user.id,
      program_id: selectedProgramId,
      program_title: programTitle,
      action: "removed",
    });

    toast.success("Program kaldırıldı (geçmiş verileri korundu)");
    setRemoving(false);
    setRemoveOpen(false);
    fetchPrograms();
  };

  // Fetch history logs — paginated
  const fetchHistoryPage = async (page: number, append = false) => {
    const from = page * HISTORY_PAGE_SIZE;
    const to = from + HISTORY_PAGE_SIZE - 1;
    const { data } = await supabase
      .from("program_assignment_logs")
      .select("id, program_id, program_title, action, created_at, coach_id, assignment_batch_id")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false })
      .range(from, to);

    const logs = (data ?? []) as AssignmentLog[];
    if (append) {
      setHistoryLogs((prev) => [...prev, ...logs]);
    } else {
      setHistoryLogs(logs);
    }
    setHistoryHasMore(logs.length === HISTORY_PAGE_SIZE);
    historyPageRef.current = page;
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setExpandedLogId(null);
    setExpandedCache({});
    await fetchHistoryPage(0);
    setHistoryLoading(false);
  };

  const loadMoreHistory = async () => {
    setHistoryLoadingMore(true);
    await fetchHistoryPage(historyPageRef.current + 1, true);
    setHistoryLoadingMore(false);
  };

  // Expand a log entry — lightweight (no exercises JSON), paginated
  const fetchExpandPage = async (log: AssignmentLog, page: number) => {
    const requestId = ++expandRequestRef.current;
    const from = page * EXPAND_PAGE_SIZE;
    const to = from + EXPAND_PAGE_SIZE - 1;

    let query = supabase
      .from("assigned_workouts")
      .select("id, workout_name, day_of_week, scheduled_date, status")
      .eq("athlete_id", athleteId);

    // Use batch_id if available, else fall back to program_id
    if (log.assignment_batch_id) {
      query = query.eq("assignment_batch_id", log.assignment_batch_id);
    } else {
      query = query.eq("program_id", log.program_id);
    }

    const { data } = await query
      .order("scheduled_date", { ascending: true })
      .range(from, to);

    // Guard against stale responses
    if (expandRequestRef.current !== requestId) return;

    const rows = (data ?? []) as LightWorkout[];

    // Deduplicate by day_of_week for weekly template view
    const seenDays = new Set<string>();

    setExpandedCache((prev) => {
      const existing = prev[log.id];
      const prevWorkouts = page === 0 ? [] : (existing?.workouts ?? []);
      prevWorkouts.forEach((w) => { if (w.day_of_week) seenDays.add(w.day_of_week); });
      const newUnique = rows.filter((w) => {
        const key = w.day_of_week || w.id;
        if (seenDays.has(key)) return false;
        seenDays.add(key);
        return true;
      });
      return {
        ...prev,
        [log.id]: {
          workouts: [...prevWorkouts, ...newUnique],
          page,
          hasMore: rows.length === EXPAND_PAGE_SIZE,
          loading: false,
        },
      };
    });
  };

  const toggleLogExpand = async (log: AssignmentLog) => {
    if (expandedLogId === log.id) {
      setExpandedLogId(null);
      return;
    }
    setExpandedLogId(log.id);

    // Only fetch if not cached
    if (!expandedCache[log.id]) {
      setExpandedCache((prev) => ({
        ...prev,
        [log.id]: { workouts: [], page: 0, hasMore: false, loading: true },
      }));
      await fetchExpandPage(log, 0);
    }
  };
  };

  const selectedProgram = allPrograms.find(p => p.id === selectedProgramId) ?? null;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  // No programs at all
  if (allPrograms.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={openHistory}>
            <History className="w-4 h-4 mr-1.5" />
            Program Geçmişi
          </Button>
        </div>
        <div className="glass rounded-xl border border-border p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Dumbbell className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Atanmış program yok</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Bu sporcuya henüz bir antrenman programı atanmadı
          </p>
          <Button onClick={() => navigate("/programs")} className="bg-primary text-primary-foreground">
            <Dumbbell className="w-4 h-4 mr-2" />
            Program Mimarı'na Git
          </Button>
        </div>
        <HistoryDialog
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          loading={historyLoading}
          logs={historyLogs}
          expandedLogId={expandedLogId}
          expandedCache={expandedCache}
          onToggleLog={toggleLogExpand}
          onLoadMoreExpand={fetchExpandPage}
          historyHasMore={historyHasMore}
          historyLoadingMore={historyLoadingMore}
          onLoadMoreHistory={loadMoreHistory}
        />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {/* Top bar: History button */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            Atanmış Programlar ({allPrograms.length})
          </h3>
          <Button variant="outline" size="sm" onClick={openHistory}>
            <History className="w-4 h-4 mr-1.5" />
            Program Geçmişi
          </Button>
        </div>

        {/* Program List — enhanced cards */}
        <div className="space-y-3">
          {allPrograms.map((prog) => {
            const isSelected = prog.id === selectedProgramId;

            const difficultyMap: Record<string, string> = {
              beginner: "Başlangıç", intermediate: "Orta Seviye", advanced: "İleri Seviye",
              Beginner: "Başlangıç", Intermediate: "Orta Seviye", Advanced: "İleri Seviye",
            };
            const goalMap: Record<string, string> = {
              muscle_gain: "Kas Gelişimi", fat_loss: "Yağ Yakımı", strength: "Güç Artışı",
              endurance: "Dayanıklılık", maintenance: "Koruma", recomp: "Vücut Şekillendirme",
              general_fitness: "Genel Fitness",
            };
            const difficultyTr = prog.difficulty ? (difficultyMap[prog.difficulty] || prog.difficulty) : null;
            const goalTr = prog.target_goal ? (goalMap[prog.target_goal] || prog.target_goal) : null;

            return (
              <button
                key={prog.id}
                onClick={() => setSelectedProgramId(prog.id)}
                className={cn(
                  "w-full flex items-start justify-between p-5 rounded-xl border-2 text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 glow-lime"
                    : "border-border glass glass-hover"
                )}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                    isSelected ? "bg-primary/20" : "bg-muted/50"
                  )}>
                    <Dumbbell className={cn("w-6 h-6", isSelected ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <span className={cn("text-base font-bold block truncate", isSelected ? "text-primary" : "text-foreground")}>
                      {prog.title}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {difficultyTr && (
                        <Badge className="text-[10px] bg-warning/15 text-warning border-warning/30 hover:bg-warning/20">
                          {difficultyTr}
                        </Badge>
                      )}
                      {goalTr && (
                        <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30 hover:bg-primary/20">
                          {goalTr}
                        </Badge>
                      )}
                      {prog.active_day_count > 0 && (
                        <Badge className="text-[10px] bg-accent/15 text-accent border-accent/30 hover:bg-accent/20">
                          {prog.active_day_count} gün/hf
                        </Badge>
                      )}
                      {prog.assigned_at && (
                        <Badge className="text-[10px] bg-secondary text-muted-foreground border-border hover:bg-secondary/80">
                          📅 {new Date(prog.assigned_at).toLocaleDateString('tr-TR')}
                        </Badge>
                      )}
                    </div>
                    {prog.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{prog.description}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs h-8 shrink-0 ml-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProgramId(prog.id);
                    setRemoveOpen(true);
                  }}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Kaldır
                </Button>
              </button>
            );
          })}
        </div>

        {/* Preview Section */}
        {selectedProgramId && selectedProgram ? (
          <div className="glass rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                {selectedProgram.title} — Haftalık Şablon
              </h4>
              {!loadingWorkouts && (
                <Badge variant="outline" className="text-[10px]">{workouts.length} gün</Badge>
              )}
            </div>
            {selectedProgram.description && (
              <p className="text-xs text-muted-foreground mb-4">{selectedProgram.description}</p>
            )}
            {loadingWorkouts ? (
              <Skeleton className="h-32 w-full rounded-lg" />
            ) : (
              <WorkoutList workouts={workouts} onPreviewExercise={setPreviewExercise} />
            )}
          </div>
        ) : (
          <div className="glass rounded-xl border border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">Önizlemek için yukarıdan bir program seçin</p>
          </div>
        )}
      </div>

      {/* Exercise Preview Dialog */}
      <Dialog open={!!previewExercise} onOpenChange={(open) => !open && setPreviewExercise(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{previewExercise?.name}</DialogTitle>
          </DialogHeader>
          {previewExercise?.video_url && (
            <img
              src={previewExercise.video_url}
              alt={previewExercise.name}
              className="w-full max-h-[60vh] object-contain rounded-lg"
            />
          )}
          {previewExercise?.notes && (
            <p className="text-sm text-muted-foreground">{previewExercise.notes}</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove Program Confirmation */}
      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Programı Kaldır</AlertDialogTitle>
            <AlertDialogDescription>
              "{selectedProgram?.title}" programını aktif programdan kaldırmak istediğinizden emin misiniz?
              Geçmiş antrenman verileri korunacaktır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveProgram}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Kaldır
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* History Dialog */}
      <HistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        loading={historyLoading}
        logs={historyLogs}
        expandedLogId={expandedLogId}
        expandedCache={expandedCache}
        onToggleLog={toggleLogExpand}
        onLoadMoreExpand={fetchExpandPage}
        historyHasMore={historyHasMore}
        historyLoadingMore={historyLoadingMore}
        onLoadMoreHistory={loadMoreHistory}
      />
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WorkoutList({ workouts, onPreviewExercise }: { workouts: AssignedWorkout[]; onPreviewExercise: (ex: ExerciseJson) => void }) {
  if (workouts.length === 0) {
    return (
      <div className="glass rounded-xl border border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">Bu programa ait antrenman bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workouts.map((workout) => (
        <div key={workout.id} className="glass rounded-xl border border-border overflow-hidden">
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-base font-bold text-foreground truncate">{workout.workout_name}</h4>
              {workout.day_of_week && (
                <span className="text-xs text-muted-foreground">
                  {workout.day_of_week}
                  {workout.scheduled_date && (
                    <span> — {format(parseISO(workout.scheduled_date), "d MMMM yyyy", { locale: tr })}</span>
                  )}
                </span>
              )}
            </div>
            <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border text-xs shrink-0">
              {workout.exercises.length} egzersiz
            </Badge>
          </div>

          {workout.day_notes && (
            <div className="mx-4 mb-3 p-3 rounded-lg bg-muted/40 border border-border/50">
              <div className="flex items-start gap-2">
                <StickyNote className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{workout.day_notes}</p>
              </div>
            </div>
          )}

          {workout.exercises.length > 0 && (
            <div className="px-4 pb-4">
              <div className="space-y-2">
                {workout.exercises.map((ex, idx) => (
                  <ExerciseCard key={idx} ex={ex} idx={idx} onPreview={onPreviewExercise} />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ExerciseCard({ ex, idx, onPreview }: { ex: ExerciseJson; idx: number; onPreview: (ex: ExerciseJson) => void }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 border border-border/50">
      <button
        type="button"
        onClick={() => ex.video_url && onPreview(ex)}
        className={cn(
          "w-12 h-12 rounded-lg shrink-0 overflow-hidden border border-border/50",
          ex.video_url && "cursor-pointer hover:border-primary/50 transition-colors"
        )}
      >
        {ex.video_url ? (
          <img
            src={ex.video_url}
            alt={ex.name}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove("hidden");
            }}
          />
        ) : null}
        <div className={cn(
          "w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center",
          ex.video_url && "hidden"
        )}>
          <Dumbbell className="w-5 h-5 text-primary/60" />
        </div>
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
            {idx + 1}
          </span>
          <span className="text-sm font-semibold text-foreground truncate">{ex.name}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {ex.sets && ex.reps && (
            <Badge variant="outline" className="text-[11px] h-5 px-1.5 bg-muted/50 font-mono">
              {ex.sets} Set × {ex.reps}
            </Badge>
          )}
          {ex.rir !== undefined && ex.rir !== null && (
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] h-5 px-1.5 font-mono",
                ex.rir === 0 ? "border-destructive/50 text-destructive bg-destructive/10" : "bg-muted/50"
              )}
            >
              RIR {ex.rir}
            </Badge>
          )}
          {ex.failure_set && (
            <Badge variant="outline" className="text-[11px] h-5 px-1.5 border-destructive/50 text-destructive bg-destructive/10">
              <Zap className="w-3 h-3 mr-0.5" />
              Failure
            </Badge>
          )}
          {ex.rest_time && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {ex.rest_time}
            </span>
          )}
        </div>
        {ex.notes && (
          <div className="mt-1.5 p-1.5 rounded-md bg-accent/50 border border-accent">
            <p className="text-[11px] text-accent-foreground leading-snug">{ex.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryDialog({
  open,
  onOpenChange,
  loading,
  logs,
  expandedLogId,
  expandedCache,
  onToggleLog,
  onLoadMoreExpand,
  historyHasMore,
  historyLoadingMore,
  onLoadMoreHistory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  logs: AssignmentLog[];
  expandedLogId: string | null;
  expandedCache: Record<string, ExpandedLogCache>;
  onToggleLog: (log: AssignmentLog) => void;
  onLoadMoreExpand: (log: AssignmentLog, page: number) => void;
  historyHasMore: boolean;
  historyLoadingMore: boolean;
  onLoadMoreHistory: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-lg h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Program Atama Geçmişi
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Henüz bir atama kaydı bulunmuyor</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6 min-h-0">
            <div className="space-y-2 pb-4">
              {logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const cache = expandedCache[log.id];
                return (
                  <div key={log.id} className="glass rounded-lg border border-border overflow-hidden">
                    <button
                      onClick={() => onToggleLog(log)}
                      className="w-full text-left p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground truncate">{log.program_title}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] shrink-0",
                              log.action === "assigned"
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-destructive/10 text-destructive border-destructive/20"
                            )}
                          >
                            {log.action === "assigned" ? "Atandı" : "Kaldırıldı"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "d MMMM yyyy, HH:mm", { locale: tr })}
                        </p>
                      </div>
                    </button>

                    {isExpanded && cache && (
                      <div className="border-t border-border p-3">
                        {cache.loading ? (
                          <div className="flex justify-center py-3">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : cache.workouts.length > 0 ? (
                          <div className="space-y-1.5">
                            {cache.workouts.map((w) => (
                              <div key={w.id} className="p-2 rounded-lg bg-muted/30 flex items-center gap-2">
                                <Dumbbell className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="text-xs font-semibold text-foreground truncate">{w.workout_name}</span>
                                {w.day_of_week && (
                                  <span className="text-[10px] text-muted-foreground shrink-0">({w.day_of_week})</span>
                                )}
                                {w.scheduled_date && (
                                  <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">
                                    {format(parseISO(w.scheduled_date), "d MMM", { locale: tr })}
                                  </span>
                                )}
                              </div>
                            ))}
                            {cache.hasMore && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-xs h-7"
                                onClick={() => onLoadMoreExpand(log, cache.page + 1)}
                              >
                                Daha fazla yükle
                              </Button>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            Bu program için antrenman verisi bulunamadı
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {historyHasMore && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={onLoadMoreHistory}
                  disabled={historyLoadingMore}
                >
                  {historyLoadingMore ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : null}
                  Daha fazla geçmiş yükle
                </Button>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

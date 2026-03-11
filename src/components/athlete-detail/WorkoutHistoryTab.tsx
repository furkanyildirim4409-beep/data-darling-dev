import { useState, useEffect, useCallback, useMemo } from "react";
import { format, subDays, subMonths, startOfDay, endOfDay } from "date-fns";
import { tr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Clock, Dumbbell, Flame, Target, Link2, Loader2, CalendarIcon, X, TrendingUp, TrendingDown, AlertTriangle, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformedSet {
  weight?: number;
  reps?: number;
  rir?: number;
  failure?: boolean;
  isFailure?: boolean;
}

interface ExerciseDetail {
  name?: string;
  exerciseName?: string;
  sets?: number | PerformedSet[];
  reps?: string | number;
  targetSets?: number;
  targetReps?: string | number;
  rir?: number;
  failure_set?: boolean;
  failureSet?: boolean;
  groupId?: string | null;
  rest_time?: string;
  notes?: string;
  actualSets?: PerformedSet[];
  completedSets?: PerformedSet[];
  sets_completed?: PerformedSet[];
  performed?: PerformedSet[];
  weightDiff?: number | null;
  rirSuccess?: boolean | null;
}

interface WorkoutLog {
  id: string;
  workout_name: string;
  logged_at: string | null;
  duration_minutes: number | null;
  tonnage: number | null;
  exercises_count: number | null;
  details: ExerciseDetail[] | null;
  completed: boolean | null;
}

const PAGE_SIZE = 20;

function getPerformedSetsStatic(ex: ExerciseDetail): PerformedSet[] {
  if (Array.isArray(ex.sets)) return ex.sets;
  return ex.actualSets || ex.completedSets || ex.sets_completed || ex.performed || [];
}

function calcTonnageRaw(details: ExerciseDetail[] | null): number {
  if (!details) return 0;
  return details.reduce((total, ex) => {
    const sets = getPerformedSetsStatic(ex);
    return total + sets.reduce((s, set) => s + ((set.weight || 0) * (set.reps || 0)), 0);
  }, 0);
}

function buildVolumeMap(logs: WorkoutLog[]): Record<string, { pctChange: number | null; isFirst: boolean }> {
  const sorted = [...logs].sort((a, b) =>
    new Date(a.logged_at || 0).getTime() - new Date(b.logged_at || 0).getTime()
  );
  const lastByName: Record<string, number> = {};
  const result: Record<string, { pctChange: number | null; isFirst: boolean }> = {};

  for (const log of sorted) {
    const tonnage = calcTonnageRaw(log.details);
    const prev = lastByName[log.workout_name];
    if (prev == null) {
      result[log.id] = { pctChange: null, isFirst: true };
    } else if (prev > 0) {
      result[log.id] = { pctChange: Math.round(((tonnage - prev) / prev) * 100), isFirst: false };
    } else {
      result[log.id] = { pctChange: null, isFirst: false };
    }
    lastByName[log.workout_name] = tonnage;
  }
  return result;
}

function buildExerciseProgressionMap(logs: WorkoutLog[]): Record<string, { isGlobalPR: boolean; weightDiff: number | null }> {
  const sorted = [...logs].sort((a, b) =>
    new Date(a.logged_at || 0).getTime() - new Date(b.logged_at || 0).getTime()
  );
  const prevMaxByExercise: Record<string, number> = {};
  const result: Record<string, { isGlobalPR: boolean; weightDiff: number | null }> = {};

  for (const log of sorted) {
    for (const ex of log.details ?? []) {
      const name = (ex.name || ex.exerciseName || "").toLowerCase().trim();
      if (!name) continue;
      const sets = getPerformedSetsStatic(ex);
      const maxWeight = Math.max(0, ...sets.map(s => s.weight || 0));
      if (maxWeight === 0) continue;

      const prev = prevMaxByExercise[name];
      const key = `${log.id}:${name}`;

      if (prev == null) {
        result[key] = { isGlobalPR: true, weightDiff: null };
      } else {
        const diff = maxWeight - prev;
        result[key] = {
          isGlobalPR: maxWeight > prev,
          weightDiff: diff !== 0 ? diff : null,
        };
      }
      prevMaxByExercise[name] = Math.max(prev ?? 0, maxWeight);
    }
  }
  return result;
}

// Parse details from various possible JSON shapes
function parseDetails(raw: unknown): ExerciseDetail[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw as ExerciseDetail[];
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.exercises)) return obj.exercises as ExerciseDetail[];
  }
  return null;
}

type QuickRange = "all" | "7d" | "30d" | "90d" | "custom";

const quickRanges: { value: QuickRange; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "7d", label: "7 Gün" },
  { value: "30d", label: "30 Gün" },
  { value: "90d", label: "90 Gün" },
  { value: "custom", label: "Özel" },
];

export function WorkoutHistoryTab({ athleteId }: { athleteId: string }) {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  // Date filtering
  const [quickRange, setQuickRange] = useState<QuickRange>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const volumeMap = useMemo(() => buildVolumeMap(logs), [logs]);
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const getDateRange = useCallback((): { from?: string; to?: string } => {
    if (quickRange === "all") return {};
    if (quickRange === "custom") {
      return {
        from: dateFrom ? startOfDay(dateFrom).toISOString() : undefined,
        to: dateTo ? endOfDay(dateTo).toISOString() : undefined,
      };
    }
    const days = quickRange === "7d" ? 7 : quickRange === "30d" ? 30 : 90;
    return { from: startOfDay(subDays(new Date(), days)).toISOString() };
  }, [quickRange, dateFrom, dateTo]);

  const fetchPage = useCallback(async (offset: number) => {
    const range = getDateRange();
    let query = supabase
      .from("workout_logs")
      .select("id, workout_name, logged_at, duration_minutes, tonnage, exercises_count, details, completed")
      .eq("user_id", athleteId)
      .order("logged_at", { ascending: false });

    if (range.from) query = query.gte("logged_at", range.from);
    if (range.to) query = query.lte("logged_at", range.to);

    const { data } = await query.range(offset, offset + PAGE_SIZE - 1);

    const parsed = (data ?? []).map(d => ({
      ...d,
      details: parseDetails(d.details),
    }));

    if (parsed.length < PAGE_SIZE) setHasMore(false);
    return parsed;
  }, [athleteId, getDateRange]);

  // Reset and refetch when filters change
  useEffect(() => {
    setLogs([]);
    setHasMore(true);
    setLoading(true);
    fetchPage(0).then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, [athleteId, fetchPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    const data = await fetchPage(logs.length);
    setLogs(prev => [...prev, ...data]);
    setLoadingMore(false);
  };

  const toggle = (id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getPerformedSets = (ex: ExerciseDetail): PerformedSet[] => {
    if (Array.isArray(ex.sets)) return ex.sets;
    return ex.actualSets || ex.completedSets || ex.sets_completed || ex.performed || [];
  };

  const getExerciseName = (ex: ExerciseDetail): string => {
    return ex.name || ex.exerciseName || "Bilinmeyen Egzersiz";
  };

  const filterBar = (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {quickRanges.map((r) => (
        <Button
          key={r.value}
          variant={quickRange === r.value ? "default" : "outline"}
          size="sm"
          className="text-xs h-7"
          onClick={() => {
            setQuickRange(r.value);
            if (r.value !== "custom") {
              setDateFrom(undefined);
              setDateTo(undefined);
            }
          }}
        >
          {r.label}
        </Button>
      ))}

      {quickRange === "custom" && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("text-xs h-7 gap-1", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="w-3 h-3" />
                {dateFrom ? format(dateFrom, "d MMM yyyy", { locale: tr }) : "Başlangıç"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                disabled={(d) => d > new Date() || (dateTo ? d > dateTo : false)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">—</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("text-xs h-7 gap-1", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="w-3 h-3" />
                {dateTo ? format(dateTo, "d MMM yyyy", { locale: tr }) : "Bitiş"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                disabled={(d) => d > new Date() || (dateFrom ? d < dateFrom : false)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div>
        {filterBar}
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!logs.length) {
    return (
      <div>
        {filterBar}
        <div className="glass rounded-xl border border-border p-12 text-center">
          <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">
            {quickRange !== "all" ? "Bu tarih aralığında antrenman kaydı bulunamadı." : "Henüz tamamlanmış antrenman kaydı yok."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filterBar}
      {logs.map(log => {
        const isOpen = openIds.has(log.id);
        const exercises = log.details ?? [];
        const groupIds = [...new Set(exercises.map(e => e.groupId).filter(Boolean))] as string[];

        return (
          <Collapsible key={log.id} open={isOpen} onOpenChange={() => toggle(log.id)}>
            <div className="glass rounded-xl border border-border overflow-hidden">
              <CollapsibleTrigger className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 text-left min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground text-base">{log.workout_name}</p>
                      {(() => {
                        const vol = volumeMap[log.id];
                        if (!vol) return null;
                        if (vol.isFirst) return (
                          <Badge variant="outline" className="text-[11px] px-2 py-0.5 border-border text-muted-foreground">
                            İlk Kayıt
                          </Badge>
                        );
                        if (vol.pctChange != null && vol.pctChange > 0) return (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[11px] px-2 py-0.5">
                            <TrendingUp className="w-3.5 h-3.5 mr-0.5" />↑ +%{vol.pctChange} Hacim
                          </Badge>
                        );
                        if (vol.pctChange != null && vol.pctChange < 0) return (
                          <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[11px] px-2 py-0.5">
                            <TrendingDown className="w-3.5 h-3.5 mr-0.5" />↓ %{vol.pctChange} Hacim
                          </Badge>
                        );
                        return null;
                      })()}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {log.logged_at ? new Date(log.logged_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  {log.duration_minutes && (
                    <div className="hidden sm:flex items-center gap-1.5 bg-muted/60 text-foreground px-3 py-1.5 rounded-lg">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{log.duration_minutes} dk</span>
                    </div>
                  )}
                  {log.tonnage != null && log.tonnage > 0 && (
                    <div className="hidden sm:flex items-center gap-1.5 bg-muted/60 text-foreground px-3 py-1.5 rounded-lg">
                      <Dumbbell className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{Math.round(log.tonnage)} kg</span>
                    </div>
                  )}
                  {log.exercises_count && (
                    <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-lg">
                      <span className="text-sm font-semibold">{log.exercises_count}</span>
                      <span className="text-sm">egzersiz</span>
                    </div>
                  )}
                  <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-5 pb-5 space-y-2 border-t border-border pt-4">
                  {exercises.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">
                      {log.exercises_count ? `${log.exercises_count} egzersiz tamamlandı (detay mevcut değil)` : "Detay bilgisi yok"}
                    </p>
                  )}
                  {exercises.map((ex, idx) => {
                    const isFailure = ex.failure_set === true || ex.failureSet === true;
                    const hasRir = ex.rir != null;
                    const groupColor = ex.groupId ? getGroupColor(groupIds.indexOf(ex.groupId)) : null;
                    const isFirstInGroup = ex.groupId && (idx === 0 || exercises[idx - 1]?.groupId !== ex.groupId);
                    const isLastInGroup = ex.groupId && (idx === exercises.length - 1 || exercises[idx + 1]?.groupId !== ex.groupId);

                    return (
                      <div key={idx}>
                        {isFirstInGroup && (
                          <div className="flex items-center gap-1.5 mt-3 mb-1.5 text-xs text-muted-foreground">
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Süperset</span>
                          </div>
                        )}
                        <div
                          className={cn(
                            "flex items-center justify-between py-3 px-4 rounded-lg bg-muted/30",
                            groupColor && `border-l-[3px]`,
                          )}
                          style={groupColor ? { borderLeftColor: groupColor } : undefined}
                        >
                          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                            <span className="text-sm font-semibold text-foreground truncate">{getExerciseName(ex)}</span>
                            {isFailure && (
                              <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-[11px] px-2 py-0.5">
                                <Flame className="w-3.5 h-3.5 mr-0.5" />Tükeniş
                              </Badge>
                            )}
                            {hasRir && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[11px] px-2 py-0.5 border-border",
                                  ex.rir === 0 ? "text-orange-400 border-orange-500/30" : "text-muted-foreground"
                                )}
                              >
                                <Target className="w-3.5 h-3.5 mr-0.5" />RIR: {ex.rir}
                              </Badge>
                            )}
                            {ex.weightDiff != null && ex.weightDiff !== 0 && (
                              <span className={cn(
                                "text-[11px] font-medium px-2 py-0.5 rounded flex items-center gap-0.5",
                                ex.weightDiff > 0 ? "text-emerald-400 bg-emerald-400/10" : "text-orange-400 bg-orange-400/10"
                              )}>
                                {ex.weightDiff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                {ex.weightDiff > 0 ? `+${ex.weightDiff}kg` : `${ex.weightDiff}kg`}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0 ml-3">
                            {(() => {
                              const targetSets = typeof ex.targetSets === 'number' ? ex.targetSets : (typeof ex.sets === 'number' ? ex.sets : null);
                              const targetReps = ex.targetReps || ex.reps;
                              return targetSets && targetReps ? (
                                <span className="opacity-60 text-xs">Hedef: {targetSets}×{targetReps}</span>
                              ) : null;
                            })()}

                            {(() => {
                              const performed = getPerformedSets(ex);
                              return performed.length > 0 ? (
                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                  {performed.map((s, si) => {
                                    const repsMet = ex.reps != null && s.reps != null && s.reps >= Number(ex.reps);
                                    const isSetFailure = s.failure === true || s.isFailure === true;
                                    return (
                                      <span
                                        key={si}
                                        className={cn(
                                          "px-2 py-1 rounded text-[11px] font-mono",
                                          isSetFailure
                                            ? "bg-orange-500/10 text-orange-400"
                                            : repsMet
                                              ? "bg-green-500/10 text-green-400"
                                              : "bg-muted text-muted-foreground"
                                        )}
                                      >
                                        {s.weight ?? "—"}kg×{s.reps ?? "—"}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : null;
                            })()}
                            {ex.rir != null && ex.rirSuccess === false && (
                              <span className="text-[11px] text-destructive flex items-center gap-0.5">
                                <AlertTriangle className="w-3.5 h-3.5" /> RIR Hedefi Kaçırıldı
                              </span>
                            )}
                          </div>
                        </div>
                        {isLastInGroup && <div className="mb-1" />}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}

      {hasMore && (
        <div className="flex justify-center pt-2 pb-4">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loadingMore}
            className="text-sm"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Yükleniyor...
              </>
            ) : (
              "Daha Fazla Göster"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function getGroupColor(index: number): string {
  const colors = [
    "hsl(210, 80%, 60%)",
    "hsl(280, 70%, 60%)",
    "hsl(340, 75%, 60%)",
    "hsl(160, 70%, 50%)",
    "hsl(40, 80%, 55%)",
  ];
  return colors[index % colors.length];
}

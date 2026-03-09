import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Clock, Dumbbell, Flame, Target, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformedSet {
  weight?: number;
  reps?: number;
  rir?: number;
  failure?: boolean;
  isFailure?: boolean;
}

interface ExerciseDetail {
  name: string;
  sets?: number;
  reps?: string | number;
  rir?: number;
  failure_set?: boolean;
  failureSet?: boolean;
  groupId?: string | null;
  rest_time?: string;
  notes?: string;
  // Multiple possible keys for performed sets
  actualSets?: PerformedSet[];
  completedSets?: PerformedSet[];
  sets_completed?: PerformedSet[];
  performed?: PerformedSet[];
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

export function WorkoutHistoryTab({ athleteId }: { athleteId: string }) {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("workout_logs")
        .select("id, workout_name, logged_at, duration_minutes, tonnage, exercises_count, details, completed")
        .eq("user_id", athleteId)
        .order("logged_at", { ascending: false })
        .limit(50);

      if (data) {
        setLogs(data.map(d => ({
          ...d,
          details: parseDetails(d.details),
        })));
      }
      setLoading(false);
    })();
  }, [athleteId]);

  const toggle = (id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Extract performed sets from any of the possible keys
  const getPerformedSets = (ex: ExerciseDetail): PerformedSet[] => {
    return ex.actualSets || ex.completedSets || ex.sets_completed || ex.performed || [];
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!logs.length) {
    return (
      <div className="glass rounded-xl border border-border p-12 text-center">
        <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">Henüz tamamlanmış antrenman kaydı yok.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map(log => {
        const isOpen = openIds.has(log.id);
        const exercises = log.details ?? [];
        const groupIds = [...new Set(exercises.map(e => e.groupId).filter(Boolean))] as string[];

        return (
          <Collapsible key={log.id} open={isOpen} onOpenChange={() => toggle(log.id)}>
            <div className="glass rounded-xl border border-border overflow-hidden">
              <CollapsibleTrigger className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4 text-left">
                  <div>
                    <p className="font-semibold text-foreground">{log.workout_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.logged_at ? new Date(log.logged_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {log.duration_minutes && (
                    <Badge variant="outline" className="hidden sm:flex gap-1 text-muted-foreground border-border">
                      <Clock className="w-3 h-3" />{log.duration_minutes} dk
                    </Badge>
                  )}
                  {log.tonnage != null && log.tonnage > 0 && (
                    <Badge variant="outline" className="hidden sm:flex gap-1 text-muted-foreground border-border">
                      <Dumbbell className="w-3 h-3" />{Math.round(log.tonnage)} kg
                    </Badge>
                  )}
                  {log.exercises_count && (
                    <Badge variant="secondary" className="text-xs">{log.exercises_count} egzersiz</Badge>
                  )}
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-5 pb-4 space-y-1.5 border-t border-border pt-3">
                  {exercises.map((ex, idx) => {
                    const isFailure = ex.failure_set === true || ex.failureSet === true;
                    const hasRir = ex.rir != null;
                    const groupColor = ex.groupId ? getGroupColor(groupIds.indexOf(ex.groupId)) : null;
                    const isFirstInGroup = ex.groupId && (idx === 0 || exercises[idx - 1]?.groupId !== ex.groupId);
                    const isLastInGroup = ex.groupId && (idx === exercises.length - 1 || exercises[idx + 1]?.groupId !== ex.groupId);

                    return (
                      <div key={idx}>
                        {isFirstInGroup && (
                          <div className="flex items-center gap-1.5 mt-2 mb-1 text-xs text-muted-foreground">
                            <Link2 className="w-3 h-3" />
                            <span>Süperset</span>
                          </div>
                        )}
                        <div
                          className={cn(
                            "flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/30",
                            groupColor && `border-l-[3px]`,
                          )}
                          style={groupColor ? { borderLeftColor: groupColor } : undefined}
                        >
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-sm font-medium text-foreground truncate">{ex.name}</span>
                            {isFailure && (
                              <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-[10px] px-1.5 py-0">
                                <Flame className="w-3 h-3 mr-0.5" />Tükeniş
                              </Badge>
                            )}
                            {hasRir && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] px-1.5 py-0 border-border",
                                  ex.rir === 0 ? "text-orange-400 border-orange-500/30" : "text-muted-foreground"
                                )}
                              >
                                <Target className="w-3 h-3 mr-0.5" />RIR: {ex.rir}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0 ml-3">
                            {/* Target */}
                            {ex.sets && ex.reps && (
                              <span className="opacity-60">Hedef: {ex.sets}×{ex.reps}</span>
                            )}
                            {/* Actual sets */}
                            {ex.actualSets && ex.actualSets.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap justify-end">
                                {ex.actualSets.map((s, si) => {
                                  const repsMet = ex.reps != null && s.reps != null && s.reps >= Number(ex.reps);
                                  const isSetFailure = s.failure === true;
                                  return (
                                    <span
                                      key={si}
                                      className={cn(
                                        "px-1.5 py-0.5 rounded text-[10px] font-mono",
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

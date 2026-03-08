import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell, Calendar, Edit, Clock, Target, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AssignedProgram {
  id: string;
  programId: string;
  title: string;
  description: string | null;
  difficulty: string | null;
  targetGoal: string | null;
  scheduledDate: string | null;
  status: string | null;
  exercises: {
    id: string;
    name: string;
    sets: number | null;
    reps: string | null;
    restTime: string | null;
    notes: string | null;
    orderIndex: number | null;
  }[];
}

interface ProgramTabProps {
  athleteId: string;
  currentProgram: string;
}

export function ProgramTab({ athleteId, currentProgram }: ProgramTabProps) {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<AssignedProgram[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignedPrograms = useCallback(async () => {
    setLoading(true);

    // Fetch assigned workouts for this athlete
    const { data: assignments, error: assignErr } = await supabase
      .from("assigned_workouts")
      .select("id, program_id, scheduled_date, status")
      .eq("athlete_id", athleteId)
      .order("scheduled_date", { ascending: false });

    if (assignErr || !assignments || assignments.length === 0) {
      setPrograms([]);
      setLoading(false);
      return;
    }

    // Get unique program IDs
    const programIds = [...new Set(assignments.map((a) => a.program_id).filter(Boolean))] as string[];

    if (programIds.length === 0) {
      setPrograms([]);
      setLoading(false);
      return;
    }

    // Fetch programs and exercises in parallel
    const [programsRes, exercisesRes] = await Promise.all([
      supabase.from("programs").select("*").in("id", programIds),
      supabase.from("exercises").select("*").in("program_id", programIds).order("order_index", { ascending: true }),
    ]);

    const programMap = new Map(
      (programsRes.data ?? []).map((p) => [p.id, p])
    );
    const exerciseMap = new Map<string, typeof exercisesRes.data>();
    for (const ex of exercisesRes.data ?? []) {
      const pid = ex.program_id as string;
      if (!exerciseMap.has(pid)) exerciseMap.set(pid, []);
      exerciseMap.get(pid)!.push(ex);
    }

    const mapped: AssignedProgram[] = assignments
      .filter((a) => a.program_id && programMap.has(a.program_id))
      .map((a) => {
        const prog = programMap.get(a.program_id!)!;
        const exs = exerciseMap.get(a.program_id!) ?? [];
        return {
          id: a.id,
          programId: a.program_id!,
          title: prog.title,
          description: prog.description,
          difficulty: prog.difficulty,
          targetGoal: prog.target_goal,
          scheduledDate: a.scheduled_date,
          status: a.status,
          exercises: exs.map((e) => ({
            id: e.id,
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            restTime: e.rest_time,
            notes: e.notes,
            orderIndex: e.order_index,
          })),
        };
      });

    setPrograms(mapped);
    setLoading(false);
  }, [athleteId]);

  useEffect(() => {
    fetchAssignedPrograms();
  }, [fetchAssignedPrograms]);

  const getDifficultyLabel = (d: string | null) => {
    switch (d) {
      case "beginner": return "Başlangıç";
      case "intermediate": return "Orta";
      case "advanced": return "İleri";
      default: return null;
    }
  };

  const getGoalLabel = (g: string | null) => {
    switch (g) {
      case "hypertrophy": return "Hipertrofi";
      case "strength": return "Güç";
      case "endurance": return "Dayanıklılık";
      case "fat_loss": return "Yağ Yakımı";
      case "general": return "Genel Fitness";
      default: return null;
    }
  };

  const getStatusBadge = (s: string | null) => {
    switch (s) {
      case "completed":
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Tamamlandı</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Devam Ediyor</Badge>;
      default:
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Bekliyor</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (programs.length === 0) {
    return (
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
    );
  }

  return (
    <div className="space-y-6">
      {programs.map((program) => (
        <div key={program.id} className="space-y-4">
          {/* Program Header */}
          <div className="glass rounded-xl border border-primary/30 p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Dumbbell className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{program.title}</h3>
                  {program.description && (
                    <p className="text-sm text-muted-foreground">{program.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {getStatusBadge(program.status)}
                    {program.scheduledDate && (
                      <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(program.scheduledDate).toLocaleDateString("tr-TR")}
                      </Badge>
                    )}
                    {getDifficultyLabel(program.difficulty) && (
                      <Badge variant="outline" className="text-xs">
                        {getDifficultyLabel(program.difficulty)}
                      </Badge>
                    )}
                    {getGoalLabel(program.targetGoal) && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        <Target className="w-3 h-3 mr-1" />
                        {getGoalLabel(program.targetGoal)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate("/programs")}
                className="border-border"
              >
                <Edit className="w-4 h-4 mr-2" />
                Düzenle
              </Button>
            </div>
          </div>

          {/* Exercises */}
          {program.exercises.length > 0 && (
            <div className="glass rounded-xl border border-border p-5">
              <h4 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-primary" />
                Egzersizler ({program.exercises.length})
              </h4>
              <div className="space-y-2">
                {program.exercises.map((ex, idx) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium text-foreground">{ex.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                      {ex.sets && <span>{ex.sets} set</span>}
                      {ex.reps && <span>×{ex.reps}</span>}
                      {ex.restTime && <span className="text-muted-foreground/60">({ex.restTime})</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

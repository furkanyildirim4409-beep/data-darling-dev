import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Clock, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface SessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SessionItem {
  id: string;
  time: string;
  clientName: string;
  type: string;
  status: "completed" | "pending";
}

const statusStyles = {
  completed: "bg-success/10 text-success border-success/30",
  pending: "bg-secondary text-muted-foreground border-border",
};

const statusLabels = {
  completed: "Tamamlandı",
  pending: "Yaklaşan",
};

export function SessionsDialog({ open, onOpenChange }: SessionsDialogProps) {
  const { user, activeCoachId } = useAuth();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!open || !user || !activeCoachId) return;

    const fetchSessions = async () => {
      setIsLoading(true);
      const today = new Date().toISOString().split("T")[0];

      const { data: workouts } = await supabase
        .from("assigned_workouts")
        .select("id, status, athlete_id, created_at, program_id")
        .eq("coach_id", activeCoachId)
        .eq("scheduled_date", today);

      if (!workouts || workouts.length === 0) {
        setSessions([]);
        setIsLoading(false);
        return;
      }

      const athleteIds = [...new Set(workouts.map((w) => w.athlete_id).filter(Boolean))] as string[];
      const programIds = [...new Set(workouts.map((w) => w.program_id).filter(Boolean))] as string[];

      const [profilesRes, programsRes] = await Promise.all([
        athleteIds.length > 0
          ? supabase.from("profiles").select("id, full_name").in("id", athleteIds)
          : Promise.resolve({ data: [] }),
        programIds.length > 0
          ? supabase.from("programs").select("id, title").in("id", programIds)
          : Promise.resolve({ data: [] }),
      ]);

      const nameMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p.full_name || "İsimsiz"]));
      const programMap = new Map((programsRes.data ?? []).map((p) => [p.id, p.title]));

      const items: SessionItem[] = workouts.map((w) => {
        const time = w.created_at ? new Date(w.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "--:--";
        return {
          id: w.id,
          time,
          clientName: w.athlete_id ? nameMap.get(w.athlete_id) || "İsimsiz" : "Atanmamış",
          type: w.program_id ? programMap.get(w.program_id) || "Antrenman" : "Antrenman",
          status: w.status === "completed" ? "completed" : "pending",
        };
      });

      items.sort((a, b) => a.time.localeCompare(b.time));
      setSessions(items);
      setIsLoading(false);
    };

    fetchSessions();
  }, [open, user]);

  const completedCount = sessions.filter((s) => s.status === "completed").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-foreground">Günlük Seans Programı</span>
              <p className="text-sm font-normal text-muted-foreground">
                Bugünkü tüm randevularınız
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <Dumbbell className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Bugün için planlanmış seans yok</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-colors",
                  statusStyles[session.status]
                )}
              >
                <div className="text-center min-w-[50px]">
                  <p className="text-lg font-bold font-mono">{session.time}</p>
                </div>

                <div className="w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center">
                  <Dumbbell className="w-5 h-5" />
                </div>

                <div className="flex-1">
                  <p className="font-medium text-foreground">{session.clientName}</p>
                  <p className="text-sm text-muted-foreground">{session.type}</p>
                </div>

                <Badge variant="outline" className="text-xs">
                  {statusLabels[session.status]}
                </Badge>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Toplam <span className="font-mono text-primary">{sessions.length}</span> seans
          </p>
          <p className="text-sm text-muted-foreground">
            Tamamlanan: <span className="font-mono text-success">{completedCount}</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

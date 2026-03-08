import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DashboardAthlete {
  id: string;
  full_name: string | null;
  readiness_score: number | null;
  email: string | null;
  avatar_url: string | null;
  streak: number | null;
}

export interface RiskDistribution {
  low: { count: number; label: string };
  medium: { count: number; label: string };
  high: { count: number; label: string };
}

export interface CriticalAthlete {
  id: string;
  name: string;
  risk: number;
  issue: string;
}

export interface DashboardStats {
  totalAthletes: number;
  todaySessions: number;
  completedToday: number;
  criticalAlerts: number;
}

export interface ComplianceData {
  workoutCompliance: number;
  checkinCompliance: number;
}

function classifyRisk(readiness: number | null): "low" | "medium" | "high" {
  const score = readiness ?? 75;
  if (score >= 70) return "low";
  if (score >= 50) return "medium";
  return "high";
}

function deriveIssue(readiness: number | null): string {
  const score = readiness ?? 75;
  if (score < 30) return "Kritik düşük hazırlık";
  if (score < 40) return "Kronik yorgunluk riski";
  if (score < 50) return "Düşük hazırlık skoru";
  if (score < 60) return "Toparlanma gerekli";
  if (score < 70) return "İzleme altında";
  return "Normal";
}

export function useDashboardData() {
  const { user } = useAuth();
  const [athletes, setAthletes] = useState<DashboardAthlete[]>([]);
  const [riskDistribution, setRiskDistribution] = useState<RiskDistribution>({
    low: { count: 0, label: "Düşük Risk" },
    medium: { count: 0, label: "Orta Risk" },
    high: { count: 0, label: "Yüksek Risk" },
  });
  const [criticalAthletes, setCriticalAthletes] = useState<CriticalAthlete[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalAthletes: 0,
    todaySessions: 0,
    completedToday: 0,
    criticalAlerts: 0,
  });
  const [compliance, setCompliance] = useState<ComplianceData>({
    workoutCompliance: 0,
    checkinCompliance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchAll = async () => {
      setIsLoading(true);
      const coachId = user.id;
      const today = new Date().toISOString().split("T")[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

      // Parallel fetches
      const [athletesRes, todaySessionsRes, weekWorkoutsRes, checkinsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, readiness_score, email, avatar_url, streak")
          .eq("coach_id", coachId)
          .eq("role", "athlete"),
        supabase
          .from("assigned_workouts")
          .select("id, status, athlete_id")
          .eq("coach_id", coachId)
          .eq("scheduled_date", today),
        supabase
          .from("assigned_workouts")
          .select("id, status")
          .eq("coach_id", coachId)
          .gte("scheduled_date", sevenDaysAgo.split("T")[0]),
        supabase
          .from("daily_checkins")
          .select("id, user_id")
          .gte("created_at", fortyEightHoursAgo),
      ]);

      const athleteList: DashboardAthlete[] = athletesRes.data ?? [];
      const athleteIds = new Set(athleteList.map((a) => a.id));

      // Risk distribution
      const dist: RiskDistribution = {
        low: { count: 0, label: "Düşük Risk" },
        medium: { count: 0, label: "Orta Risk" },
        high: { count: 0, label: "Yüksek Risk" },
      };
      const critical: CriticalAthlete[] = [];

      for (const a of athleteList) {
        const level = classifyRisk(a.readiness_score);
        dist[level].count++;
        if (level === "high") {
          critical.push({
            id: a.id,
            name: a.full_name || "İsimsiz",
            risk: Math.max(0, 100 - (a.readiness_score ?? 75)),
            issue: deriveIssue(a.readiness_score),
          });
        }
      }
      critical.sort((a, b) => b.risk - a.risk);

      // Today's sessions
      const todaySessions = todaySessionsRes.data ?? [];
      const completedToday = todaySessions.filter((s) => s.status === "completed").length;

      // Weekly compliance
      const weekWorkouts = weekWorkoutsRes.data ?? [];
      const weekCompleted = weekWorkouts.filter((w) => w.status === "completed").length;
      const workoutCompliance = weekWorkouts.length > 0 ? Math.round((weekCompleted / weekWorkouts.length) * 100) : 0;

      // Check-in compliance (last 48h)
      const recentCheckins = checkinsRes.data ?? [];
      const checkedInAthletes = new Set(
        recentCheckins.filter((c) => athleteIds.has(c.user_id)).map((c) => c.user_id)
      );
      const checkinCompliance = athleteList.length > 0 ? Math.round((checkedInAthletes.size / athleteList.length) * 100) : 0;

      setAthletes(athleteList);
      setRiskDistribution(dist);
      setCriticalAthletes(critical.slice(0, 5));
      setStats({
        totalAthletes: athleteList.length,
        todaySessions: todaySessions.length,
        completedToday,
        criticalAlerts: dist.high.count,
      });
      setCompliance({ workoutCompliance, checkinCompliance });
      setIsLoading(false);
    };

    fetchAll();
  }, [user]);

  return { athletes, riskDistribution, criticalAthletes, stats, compliance, isLoading };
}

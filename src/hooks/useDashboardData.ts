import { useState, useEffect, useCallback } from "react";
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
  riskLevel: "high" | "medium";
}

export interface DashboardStats {
  totalAthletes: number;
  todaySessions: number;
  completedToday: number;
  criticalAlerts: number;
  nutritionLoggersToday: number;
  nutritionLoggersYesterday: number;
}

export interface ComplianceData {
  workoutCompliance: number;
  checkinCompliance: number;
}

function getWeekBounds(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    weekStart: monday.toISOString().split("T")[0],
    weekEnd: sunday.toISOString().split("T")[0],
  };
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
    nutritionLoggersToday: 0,
    nutritionLoggersYesterday: 0,
  });
  const [compliance, setCompliance] = useState<ComplianceData>({
    workoutCompliance: 0,
    checkinCompliance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const coachId = user.id;
    const today = new Date().toISOString().split("T")[0];
    const { weekStart, weekEnd } = getWeekBounds();
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // Yesterday date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Step 1: Fetch athletes
    const { data: athletesData } = await supabase
      .from("profiles")
      .select("id, full_name, readiness_score, email, avatar_url, streak")
      .eq("coach_id", coachId)
      .eq("role", "athlete");

    const athleteList: DashboardAthlete[] = athletesData ?? [];
    if (athleteList.length === 0) {
      setAthletes([]);
      setRiskDistribution({ low: { count: 0, label: "Düşük Risk" }, medium: { count: 0, label: "Orta Risk" }, high: { count: 0, label: "Yüksek Risk" } });
      setCriticalAthletes([]);
      setStats({ totalAthletes: 0, todaySessions: 0, completedToday: 0, criticalAlerts: 0, nutritionLoggersToday: 0, nutritionLoggersYesterday: 0 });
      setCompliance({ workoutCompliance: 0, checkinCompliance: 0 });
      setIsLoading(false);
      return;
    }

    const athleteIds = athleteList.map((a) => a.id);

    // Step 2: Parallel queries for all metrics
    const [
      weekWorkoutsRes,
      todaySessionsRes,
      checkinsRes,
      todayNutritionRes,
      yesterdayNutritionRes,
      allNutritionLogsRes,
    ] = await Promise.all([
      // All assigned workouts this week
      supabase
        .from("assigned_workouts")
        .select("id, status, athlete_id, scheduled_date")
        .eq("coach_id", coachId)
        .gte("scheduled_date", weekStart)
        .lte("scheduled_date", weekEnd),
      // Today's sessions
      supabase
        .from("assigned_workouts")
        .select("id, status, athlete_id")
        .eq("coach_id", coachId)
        .eq("scheduled_date", today),
      // Recent checkins (48h)
      supabase
        .from("daily_checkins")
        .select("id, user_id")
        .in("user_id", athleteIds)
        .gte("created_at", fortyEightHoursAgo),
      // Today's nutrition logs
      supabase
        .from("nutrition_logs")
        .select("user_id")
        .in("user_id", athleteIds)
        .gte("logged_at", `${today}T00:00:00`)
        .lt("logged_at", `${today}T23:59:59.999`),
      // Yesterday's nutrition logs
      supabase
        .from("nutrition_logs")
        .select("user_id")
        .in("user_id", athleteIds)
        .gte("logged_at", `${yesterdayStr}T00:00:00`)
        .lt("logged_at", `${yesterdayStr}T23:59:59.999`),
      // Last 7 days nutrition logs for gap detection
      supabase
        .from("nutrition_logs")
        .select("user_id, logged_at")
        .in("user_id", athleteIds)
        .gte("logged_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order("logged_at", { ascending: false }),
    ]);

    const weekWorkouts = weekWorkoutsRes.data ?? [];
    const todaySessions = todaySessionsRes.data ?? [];
    const completedToday = todaySessions.filter((s) => s.status === "completed").length;

    // Workout compliance
    const weekCompleted = weekWorkouts.filter((w) => w.status === "completed").length;
    const workoutCompliance = weekWorkouts.length > 0 ? Math.round((weekCompleted / weekWorkouts.length) * 100) : 0;

    // Checkin compliance
    const athleteIdSet = new Set(athleteIds);
    const checkedInAthletes = new Set(
      (checkinsRes.data ?? []).filter((c) => athleteIdSet.has(c.user_id)).map((c) => c.user_id)
    );
    const checkinCompliance = athleteList.length > 0 ? Math.round((checkedInAthletes.size / athleteList.length) * 100) : 0;

    // Nutrition loggers today & yesterday
    const nutritionLoggersToday = new Set((todayNutritionRes.data ?? []).map((n) => n.user_id)).size;
    const nutritionLoggersYesterday = new Set((yesterdayNutritionRes.data ?? []).map((n) => n.user_id)).size;

    // === BEHAVIORAL RISK ANALYSIS ===

    // Per-athlete missed workouts this week (scheduled_date <= today, status != completed)
    const missedPerAthlete = new Map<string, number>();
    for (const w of weekWorkouts) {
      if (w.athlete_id && w.scheduled_date && w.scheduled_date <= today && w.status !== "completed") {
        missedPerAthlete.set(w.athlete_id, (missedPerAthlete.get(w.athlete_id) ?? 0) + 1);
      }
    }

    // Per-athlete days since last nutrition log
    const lastNutritionDate = new Map<string, string>();
    for (const n of allNutritionLogsRes.data ?? []) {
      if (!lastNutritionDate.has(n.user_id)) {
        lastNutritionDate.set(n.user_id, n.logged_at!);
      }
    }

    const nutritionGapDays = (athleteId: string): number => {
      const last = lastNutritionDate.get(athleteId);
      if (!last) return 7; // never logged in 7 days = max gap
      const diffMs = Date.now() - new Date(last).getTime();
      return Math.floor(diffMs / (24 * 60 * 60 * 1000));
    };

    // Build critical athletes list with behavioral signals
    const critical: CriticalAthlete[] = [];
    const dist: RiskDistribution = {
      low: { count: 0, label: "Düşük Risk" },
      medium: { count: 0, label: "Orta Risk" },
      high: { count: 0, label: "Yüksek Risk" },
    };

    for (const a of athleteList) {
      const missed = missedPerAthlete.get(a.id) ?? 0;
      const nutGap = nutritionGapDays(a.id);

      const isHighRisk = missed >= 3 || nutGap >= 5;
      const isMediumRisk = missed >= 2 || nutGap >= 3;

      if (isHighRisk) {
        dist.high.count++;
        const issues: string[] = [];
        if (missed >= 3) issues.push(`${missed} Antrenman Kaçırdı`);
        if (nutGap >= 5) issues.push(`${nutGap} Gün Beslenme Kaydı Yok`);
        critical.push({
          id: a.id,
          name: a.full_name || "İsimsiz",
          risk: Math.min(100, missed * 20 + nutGap * 10),
          issue: issues.join(" • "),
          riskLevel: "high",
        });
      } else if (isMediumRisk) {
        dist.medium.count++;
        const issues: string[] = [];
        if (missed >= 2) issues.push(`${missed} Antrenman Kaçırdı`);
        if (nutGap >= 3) issues.push(`${nutGap} Gün Beslenme Kaydı Yok`);
        critical.push({
          id: a.id,
          name: a.full_name || "İsimsiz",
          risk: Math.min(80, missed * 15 + nutGap * 8),
          issue: issues.join(" • "),
          riskLevel: "medium",
        });
      } else {
        dist.low.count++;
      }
    }

    // Sort: high risk first, then by risk score desc
    critical.sort((a, b) => {
      if (a.riskLevel !== b.riskLevel) return a.riskLevel === "high" ? -1 : 1;
      return b.risk - a.risk;
    });

    setAthletes(athleteList);
    setRiskDistribution(dist);
    setCriticalAthletes(critical.slice(0, 8));
    setStats({
      totalAthletes: athleteList.length,
      todaySessions: todaySessions.length,
      completedToday,
      criticalAlerts: critical.length,
      nutritionLoggersToday,
      nutritionLoggersYesterday,
    });
    setCompliance({ workoutCompliance, checkinCompliance });
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "workout_logs" }, () => fetchAll())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "daily_checkins" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "assigned_workouts" }, () => fetchAll())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "assigned_workouts" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "nutrition_logs" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchAll]);

  return { athletes, riskDistribution, criticalAthletes, stats, compliance, isLoading };
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BusinessDataPoint {
  date: string;
  athletes: number;
  workouts: number;
  revenue: number;
}

export interface BusinessPulseData {
  chartData: BusinessDataPoint[];
  currentAthletes: number;
  currentWorkouts: number;
  totalRevenue: number;
  athleteGrowth: string;
  workoutGrowth: string;
  revenueGrowth: string;
  isLoading: boolean;
}

export function useBusinessPulse(): BusinessPulseData {
  const { user, activeCoachId } = useAuth();
  const [data, setData] = useState<BusinessPulseData>({
    chartData: [],
    currentAthletes: 0,
    currentWorkouts: 0,
    totalRevenue: 0,
    athleteGrowth: "0",
    workoutGrowth: "0",
    revenueGrowth: "0",
    isLoading: true,
  });

  useEffect(() => {
    if (!user || !activeCoachId) {
      setData((d) => ({ ...d, isLoading: false }));
      return;
    }

    const fetchData = async () => {
      const coachId = activeCoachId;
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // 1. Fetch 30-day metric data for charts and growth rates + ALL-TIME revenue via RPC
      const [athletesRes, workoutLogsRes, metricsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, created_at")
          .eq("coach_id", coachId)
          .eq("role", "athlete"),
        supabase
          .from("workout_logs")
          .select("id, logged_at, user_id")
          .gte("logged_at", thirtyDaysAgo.toISOString()),
        supabase.rpc("get_coach_business_metrics", { coach_uuid: coachId }),
      ]);

      const athletes = athletesRes.data ?? [];
      const workoutLogs = workoutLogsRes.data ?? [];
      const athleteIds = new Set(athletes.map((a) => a.id));
      const coachWorkouts = workoutLogs.filter((w) => athleteIds.has(w.user_id));

      // 2. Extract ALL-TIME total revenue from RPC (sums payments + orders + assigned_payments)
      const metrics = (metricsRes.data as { total_revenue?: number } | null) ?? null;
      const absoluteTotalRevenue = Number(metrics?.total_revenue ?? 0);

      // 3. Build 30-day chart for athletes/workouts. Revenue is reported as all-time via the KPI card,
      // so the daily series stays flat at 0 to keep the query light.
      const chartData: BusinessDataPoint[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayStr = date.toISOString().split("T")[0];
        const label = date.toLocaleDateString("tr-TR", { month: "short", day: "numeric" });

        const athleteCount = athletes.filter(
          (a) => a.created_at && a.created_at.split("T")[0] <= dayStr
        ).length;

        const dayWorkouts = coachWorkouts.filter(
          (w) => w.logged_at && w.logged_at.split("T")[0] === dayStr
        ).length;

        chartData.push({ date: label, athletes: athleteCount, workouts: dayWorkouts, revenue: 0 });
      }

      const current = chartData[chartData.length - 1];
      const weekAgo = chartData[Math.max(0, chartData.length - 8)];

      const athleteGrowth = weekAgo.athletes > 0
        ? (((current.athletes - weekAgo.athletes) / weekAgo.athletes) * 100).toFixed(1)
        : current.athletes > 0 ? "100" : "0";

      const totalCurrentWeek = chartData.slice(-7).reduce((s, d) => s + d.workouts, 0);
      const totalPrevWeek = chartData.slice(-14, -7).reduce((s, d) => s + d.workouts, 0);
      const workoutGrowth = totalPrevWeek > 0
        ? (((totalCurrentWeek - totalPrevWeek) / totalPrevWeek) * 100).toFixed(1)
        : totalCurrentWeek > 0 ? "100" : "0";

      setData({
        chartData,
        currentAthletes: current.athletes,
        currentWorkouts: totalCurrentWeek,
        totalRevenue: absoluteTotalRevenue,
        athleteGrowth,
        workoutGrowth,
        revenueGrowth: "0",
        isLoading: false,
      });
    };

    fetchData();
  }, [user, activeCoachId]);

  return data;
}

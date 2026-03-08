import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BusinessDataPoint {
  date: string;
  athletes: number;
  workouts: number;
}

export interface BusinessPulseData {
  chartData: BusinessDataPoint[];
  currentAthletes: number;
  currentWorkouts: number;
  athleteGrowth: string;
  workoutGrowth: string;
  isLoading: boolean;
}

export function useBusinessPulse(): BusinessPulseData {
  const { user } = useAuth();
  const [data, setData] = useState<BusinessPulseData>({
    chartData: [],
    currentAthletes: 0,
    currentWorkouts: 0,
    athleteGrowth: "0",
    workoutGrowth: "0",
    isLoading: true,
  });

  useEffect(() => {
    if (!user) {
      setData((d) => ({ ...d, isLoading: false }));
      return;
    }

    const fetch = async () => {
      const coachId = user.id;
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [athletesRes, workoutLogsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, created_at")
          .eq("coach_id", coachId)
          .eq("role", "athlete"),
        supabase
          .from("workout_logs")
          .select("id, logged_at, user_id")
          .gte("logged_at", thirtyDaysAgo.toISOString()),
      ]);

      const athletes = athletesRes.data ?? [];
      const workoutLogs = workoutLogsRes.data ?? [];

      // Filter workout_logs to only coach's athletes
      const athleteIds = new Set(athletes.map((a) => a.id));
      const coachWorkouts = workoutLogs.filter((w) => athleteIds.has(w.user_id));

      // Build 30-day chart
      const chartData: BusinessDataPoint[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayStr = date.toISOString().split("T")[0];
        const label = date.toLocaleDateString("tr-TR", { month: "short", day: "numeric" });

        // Cumulative athletes up to this day
        const athleteCount = athletes.filter(
          (a) => a.created_at && a.created_at.split("T")[0] <= dayStr
        ).length;

        // Workouts on this day
        const dayWorkouts = coachWorkouts.filter(
          (w) => w.logged_at && w.logged_at.split("T")[0] === dayStr
        ).length;

        chartData.push({ date: label, athletes: athleteCount, workouts: dayWorkouts });
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
        athleteGrowth,
        workoutGrowth,
        isLoading: false,
      });
    };

    fetch();
  }, [user]);

  return data;
}

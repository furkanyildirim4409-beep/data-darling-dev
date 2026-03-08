import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ActionItem {
  id: string;
  type: "pr" | "checkin" | "session" | "milestone" | "alert";
  message: string;
  timestamp: string;
  rawTime: number;
  isNew?: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Şimdi";
  if (mins < 60) return `${mins}dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa önce`;
  const days = Math.floor(hours / 24);
  return `${days}g önce`;
}

export function useActionStream() {
  const { user } = useAuth();
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActions = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const coachId = user.id;
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    // Get coach's athletes first
    const { data: athletes } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("coach_id", coachId)
      .eq("role", "athlete");

    const athleteList = athletes ?? [];
    if (athleteList.length === 0) {
      setActions([]);
      setIsLoading(false);
      return;
    }

    const athleteIds = athleteList.map((a) => a.id);
    const nameMap = new Map(athleteList.map((a) => [a.id, a.full_name || "İsimsiz"]));

    // Parallel fetch recent activity
    const [workoutsRes, checkinsRes, nutritionRes, weightRes] = await Promise.all([
      supabase
        .from("workout_logs")
        .select("id, user_id, workout_name, logged_at, completed, tonnage")
        .in("user_id", athleteIds)
        .gte("logged_at", threeDaysAgo)
        .order("logged_at", { ascending: false })
        .limit(20),
      supabase
        .from("daily_checkins")
        .select("id, user_id, created_at, mood")
        .in("user_id", athleteIds)
        .gte("created_at", threeDaysAgo)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("nutrition_logs")
        .select("id, user_id, meal_name, logged_at, total_calories")
        .in("user_id", athleteIds)
        .gte("logged_at", threeDaysAgo)
        .order("logged_at", { ascending: false })
        .limit(10),
      supabase
        .from("weight_logs")
        .select("id, user_id, weight_kg, logged_at")
        .in("user_id", athleteIds)
        .gte("logged_at", threeDaysAgo)
        .order("logged_at", { ascending: false })
        .limit(10),
    ]);

    const items: ActionItem[] = [];

    // Workout logs
    for (const w of workoutsRes.data ?? []) {
      const name = nameMap.get(w.user_id) ?? "Sporcu";
      const tonnageStr = w.tonnage ? ` → ${Number(w.tonnage).toLocaleString("tr-TR")}kg tonaj` : "";
      items.push({
        id: `workout-${w.id}`,
        type: w.tonnage && Number(w.tonnage) > 0 ? "pr" : "session",
        message: `${name} "${w.workout_name}" tamamladı${tonnageStr}`,
        timestamp: timeAgo(w.logged_at ?? new Date().toISOString()),
        rawTime: new Date(w.logged_at ?? 0).getTime(),
      });
    }

    // Check-ins
    for (const c of checkinsRes.data ?? []) {
      const name = nameMap.get(c.user_id) ?? "Sporcu";
      const moodEmoji = c.mood && c.mood >= 4 ? "😊" : c.mood && c.mood <= 2 ? "😔" : "📋";
      items.push({
        id: `checkin-${c.id}`,
        type: "checkin",
        message: `${name} günlük check-in tamamladı ${moodEmoji}`,
        timestamp: timeAgo(c.created_at ?? new Date().toISOString()),
        rawTime: new Date(c.created_at ?? 0).getTime(),
      });
    }

    // Nutrition logs
    for (const n of nutritionRes.data ?? []) {
      const name = nameMap.get(n.user_id) ?? "Sporcu";
      const calStr = n.total_calories ? ` (${n.total_calories} kcal)` : "";
      items.push({
        id: `nutrition-${n.id}`,
        type: "milestone",
        message: `${name} ${n.meal_name} kaydetti${calStr}`,
        timestamp: timeAgo(n.logged_at ?? new Date().toISOString()),
        rawTime: new Date(n.logged_at ?? 0).getTime(),
      });
    }

    // Weight logs
    for (const w of weightRes.data ?? []) {
      const name = nameMap.get(w.user_id) ?? "Sporcu";
      items.push({
        id: `weight-${w.id}`,
        type: "milestone",
        message: `${name} kilo kaydetti → ${Number(w.weight_kg).toFixed(1)}kg`,
        timestamp: timeAgo(w.logged_at ?? new Date().toISOString()),
        rawTime: new Date(w.logged_at ?? 0).getTime(),
      });
    }

    // Sort by time descending, take top 15
    items.sort((a, b) => b.rawTime - a.rawTime);
    setActions(items.slice(0, 15));
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchActions();

    // Refresh every 30 seconds
    const interval = setInterval(fetchActions, 30000);
    return () => clearInterval(interval);
  }, [fetchActions]);

  return { actions, isLoading };
}

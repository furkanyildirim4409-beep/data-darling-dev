import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ActionItem {
  id: string;
  type: "pr" | "checkin" | "session" | "milestone" | "alert" | "assignment";
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
  const { user, activeCoachId, isSubCoach, teamMember, teamMemberPermissions } = useAuth();
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const athleteMapRef = useRef<Map<string, string>>(new Map());
  const athleteIdsRef = useRef<Set<string>>(new Set());

  const fetchActions = useCallback(async () => {
    if (!user || !activeCoachId) {
      setIsLoading(false);
      return;
    }

    // Assignment scoping for restricted sub-coaches
    let assignedIds: string[] | null = null;
    if (isSubCoach && teamMemberPermissions !== 'full' && teamMember?.id) {
      const { data: assignmentData } = await supabase
        .from("team_member_athletes")
        .select("athlete_id")
        .eq("team_member_id", teamMember.id);

      if (!assignmentData || assignmentData.length === 0) {
        setActions([]);
        setIsLoading(false);
        return;
      }
      assignedIds = assignmentData.map(a => a.athlete_id);
    }

    const coachId = activeCoachId;
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    let profilesQuery = supabase
      .from("profiles")
      .select("id, full_name")
      .eq("coach_id", coachId)
      .eq("role", "athlete");

    if (assignedIds) {
      profilesQuery = profilesQuery.in("id", assignedIds);
    }

    const { data: athletes } = await profilesQuery;

    const athleteList = athletes ?? [];
    if (athleteList.length === 0) {
      setActions([]);
      setIsLoading(false);
      return;
    }

    const athleteIds = athleteList.map((a) => a.id);
    const nameMap = new Map(athleteList.map((a) => [a.id, a.full_name || "İsimsiz"]));
    athleteMapRef.current = nameMap;
    athleteIdsRef.current = new Set(athleteIds);

    const [workoutsRes, checkinsRes, nutritionRes, weightRes, assignmentLogsRes] = await Promise.all([
      supabase
        .from("workout_logs")
        .select("id, user_id, workout_name, logged_at, completed, tonnage, bio_coins_earned")
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
      supabase
        .from("program_assignment_logs")
        .select("id, athlete_id, program_title, created_at, action")
        .eq("coach_id", coachId)
        .gte("created_at", threeDaysAgo)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const items: ActionItem[] = [];

    for (const w of workoutsRes.data ?? []) {
      const name = nameMap.get(w.user_id) ?? "Sporcu";
      const tonnageStr = w.tonnage && Number(w.tonnage) > 0 ? ` → ${Number(w.tonnage).toLocaleString("tr-TR")}kg tonaj` : "";
      const coinsStr = w.bio_coins_earned && Number(w.bio_coins_earned) > 0 ? ` → +${w.bio_coins_earned} 🪙` : "";
      items.push({
        id: `workout-${w.id}`,
        type: w.tonnage && Number(w.tonnage) > 0 ? "pr" : "session",
        message: `${name} "${w.workout_name}" tamamladı${tonnageStr}${coinsStr}`,
        timestamp: timeAgo(w.logged_at ?? new Date().toISOString()),
        rawTime: new Date(w.logged_at ?? 0).getTime(),
      });
    }

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

    // Program assignment logs
    for (const log of assignmentLogsRes.data ?? []) {
      const name = nameMap.get(log.athlete_id) ?? "Sporcu";
      const actionLabel = log.action === "revoked" ? "programdan çıkarıldı" : "programa atandı";
      items.push({
        id: `assignment-${log.id}`,
        type: "assignment",
        message: `${name} → "${log.program_title}" ${actionLabel}`,
        timestamp: timeAgo(log.created_at ?? new Date().toISOString()),
        rawTime: new Date(log.created_at ?? 0).getTime(),
      });
    }

    items.sort((a, b) => b.rawTime - a.rawTime);
    setActions(items.slice(0, 15));
    setIsLoading(false);
  }, [user, activeCoachId, isSubCoach, teamMember, teamMemberPermissions]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user || !activeCoachId) return;

    const channel = supabase
      .channel("action-stream-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "workout_logs" },
        (payload) => {
          const row = payload.new as any;
          if (!athleteIdsRef.current.has(row.user_id)) return;
          const name = athleteMapRef.current.get(row.user_id) ?? "Sporcu";
          const tonnageStr = row.tonnage && Number(row.tonnage) > 0 ? ` → ${Number(row.tonnage).toLocaleString("tr-TR")}kg tonaj` : "";
          const newItem: ActionItem = {
            id: `workout-${row.id}`,
            type: row.tonnage && Number(row.tonnage) > 0 ? "pr" : "session",
            message: `${name} "${row.workout_name}" tamamladı${tonnageStr}`,
            timestamp: "Şimdi",
            rawTime: Date.now(),
            isNew: true,
          };
          setActions((prev) => [newItem, ...prev.filter((a) => a.id !== newItem.id)].slice(0, 15));
          setTimeout(() => {
            setActions((prev) => prev.map((a) => (a.id === newItem.id ? { ...a, isNew: false } : a)));
          }, 3000);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "daily_checkins" },
        (payload) => {
          const row = payload.new as any;
          if (!athleteIdsRef.current.has(row.user_id)) return;
          const name = athleteMapRef.current.get(row.user_id) ?? "Sporcu";
          const moodEmoji = row.mood && row.mood >= 4 ? "😊" : row.mood && row.mood <= 2 ? "😔" : "📋";
          const newItem: ActionItem = {
            id: `checkin-${row.id}`,
            type: "checkin",
            message: `${name} günlük check-in tamamladı ${moodEmoji}`,
            timestamp: "Şimdi",
            rawTime: Date.now(),
            isNew: true,
          };
          setActions((prev) => [newItem, ...prev.filter((a) => a.id !== newItem.id)].slice(0, 15));
          setTimeout(() => {
            setActions((prev) => prev.map((a) => (a.id === newItem.id ? { ...a, isNew: false } : a)));
          }, 3000);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "program_assignment_logs" },
        (payload) => {
          const row = payload.new as any;
          if (!athleteIdsRef.current.has(row.athlete_id)) return;
          const name = athleteMapRef.current.get(row.athlete_id) ?? "Sporcu";
          const actionLabel = row.action === "revoked" ? "programdan çıkarıldı" : "programa atandı";
          const newItem: ActionItem = {
            id: `assignment-${row.id}`,
            type: "assignment",
            message: `${name} → "${row.program_title}" ${actionLabel}`,
            timestamp: "Şimdi",
            rawTime: Date.now(),
            isNew: true,
          };
          setActions((prev) => [newItem, ...prev.filter((a) => a.id !== newItem.id)].slice(0, 15));
          setTimeout(() => {
            setActions((prev) => prev.map((a) => (a.id === newItem.id ? { ...a, isNew: false } : a)));
          }, 3000);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activeCoachId]);

  useEffect(() => {
    fetchActions();
    const interval = setInterval(fetchActions, 60000);
    return () => clearInterval(interval);
  }, [fetchActions]);

  return { actions, isLoading };
}

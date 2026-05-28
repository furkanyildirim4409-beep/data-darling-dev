import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Athlete } from "@/types/shared-models";
import { supabase } from "@/integrations/supabase/client";

interface UseAthletesReturn {
  athletes: Athlete[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const tsFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatTs(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return tsFmt.format(d).replace(",", "");
}

function applyDecay(baseReadiness: number, baseCompliance: number, lastActivityIso: string | null) {
  if (!lastActivityIso) {
    return { readiness: 0, compliance: 0, injuryRisk: "Inactive" as const };
  }
  const elapsedDays = Math.floor((Date.now() - new Date(lastActivityIso).getTime()) / 86_400_000);
  if (elapsedDays >= 14) {
    return { readiness: 0, compliance: 0, injuryRisk: "Inactive" as const };
  }
  if (elapsedDays > 3) {
    const erosion = (elapsedDays - 3) * 10;
    const readiness = Math.max(0, baseReadiness - erosion);
    const compliance = Math.max(0, baseCompliance - erosion);
    const risk: Athlete["injuryRisk"] =
      readiness < 40 ? "High" : readiness < 60 ? "Medium" : "Low";
    return { readiness, compliance, injuryRisk: risk };
  }
  return {
    readiness: baseReadiness,
    compliance: baseCompliance,
    injuryRisk: "Low" as const,
  };
}

function mapProfileToAthlete(
  row: any,
  lastActivityIso: string | null,
  lastCheckinIso: string | null,
  expiryIso: string | null,
): Athlete {
  const baseReadiness = row.readiness_score ?? 75;
  const baseCompliance = 80;
  const { readiness, compliance, injuryRisk } = applyDecay(baseReadiness, baseCompliance, lastActivityIso);

  return {
    id: row.id,
    name: row.full_name || "İsimsiz",
    email: row.email || "",
    phone: "",
    avatar: row.avatar_url || undefined,
    sport: "",
    tier: "Standard",
    compliance,
    readiness,
    injuryRisk,
    checkInStatus: "pending",
    bloodworkStatus: "pending",
    subscriptionExpiry: expiryIso ?? "",
    currentCalories: 0,
    currentProtein: 0,
    currentProgram: "",
    currentDiet: "",
    joinDate: formatTs(row.created_at),
    lastActive: formatTs(lastActivityIso ?? row.updated_at),
    lastCheckinAt: lastCheckinIso,
  };
}

export function useAthletes(): UseAthletesReturn {
  const { user, activeCoachId, isSubCoach, teamMember, teamMemberPermissions } = useAuth();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teamMemberId = teamMember?.id ?? null;

  const activeCoachIdRef = useRef(activeCoachId);
  useEffect(() => {
    activeCoachIdRef.current = activeCoachId;
  }, [activeCoachId]);

  const fetchAthletes = useCallback(async () => {
    if (!user || !activeCoachId) return;
    const coachIdAtRequest = activeCoachId;

    try {
      setError(null);
      setIsLoading(true);

      let assignedIds: string[] | null = null;
      if (isSubCoach && teamMemberPermissions !== 'full' && teamMemberId) {
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("team_member_athletes")
          .select("athlete_id")
          .eq("team_member_id", teamMemberId);

        if (activeCoachIdRef.current !== coachIdAtRequest) return;
        if (assignmentError || !assignmentData || assignmentData.length === 0) {
          setAthletes([]);
          setIsLoading(false);
          return;
        }
        assignedIds = assignmentData.map(a => a.athlete_id);
      }

      let query = supabase
        .from("profiles")
        .select("*")
        .eq("role", "athlete")
        .eq("coach_id", coachIdAtRequest);

      if (assignedIds && assignedIds.length > 0) {
        query = query.in('id', assignedIds);
      }

      const { data, error: fetchError } = await query;
      if (activeCoachIdRef.current !== coachIdAtRequest) return;
      if (fetchError) throw fetchError;

      const rows = data || [];
      const athleteIds = rows.map((r: any) => r.id);

      // Last activity + last check-in + paid coaching expiry from real data streams
      const lastActivity = new Map<string, string>();
      const lastCheckin = new Map<string, string>();
      const subscriptionExpiry = new Map<string, string>();

      if (athleteIds.length > 0) {
        const sinceIso = new Date(Date.now() - 60 * 86_400_000).toISOString();
        const [checkinsRes, workoutsRes, ordersRes] = await Promise.all([
          supabase
            .from("daily_checkins")
            .select("user_id, created_at")
            .in("user_id", athleteIds)
            .gte("created_at", sinceIso),
          supabase
            .from("workout_logs")
            .select("user_id, logged_at")
            .in("user_id", athleteIds)
            .gte("logged_at", sinceIso),
          supabase
            .from("orders")
            .select("user_id, expires_at, created_at")
            .in("user_id", athleteIds)
            .eq("status", "paid")
            .eq("order_type", "coaching"),
        ]);

        if (activeCoachIdRef.current !== coachIdAtRequest) return;

        for (const c of checkinsRes.data ?? []) {
          if (!c.created_at || !c.user_id) continue;
          const prevAct = lastActivity.get(c.user_id);
          if (!prevAct || c.created_at > prevAct) lastActivity.set(c.user_id, c.created_at);
          const prevChk = lastCheckin.get(c.user_id);
          if (!prevChk || c.created_at > prevChk) lastCheckin.set(c.user_id, c.created_at);
        }
        for (const w of workoutsRes.data ?? []) {
          if (!w.logged_at || !w.user_id) continue;
          const prev = lastActivity.get(w.user_id);
          if (!prev || w.logged_at > prev) lastActivity.set(w.user_id, w.logged_at);
        }
        for (const o of ordersRes.data ?? []) {
          if (!o.user_id || !o.expires_at) continue;
          const prev = subscriptionExpiry.get(o.user_id);
          if (!prev || o.expires_at > prev) subscriptionExpiry.set(o.user_id, o.expires_at);
        }
      }

      setAthletes(
        rows.map((r: any) =>
          mapProfileToAthlete(
            r,
            lastActivity.get(r.id) ?? r.updated_at ?? null,
            lastCheckin.get(r.id) ?? null,
            subscriptionExpiry.get(r.id) ?? null,
          ),
        ),
      );
    } catch (err: any) {
      if (activeCoachIdRef.current === coachIdAtRequest) {
        console.error("Failed to fetch athletes:", err);
        setError(err.message || "Sporcular yüklenemedi");
      }
    } finally {
      if (activeCoachIdRef.current === coachIdAtRequest) {
        setIsLoading(false);
      }
    }
  }, [user, activeCoachId, isSubCoach, teamMemberId, teamMemberPermissions]);

  useEffect(() => {
    fetchAthletes();
  }, [fetchAthletes]);

  const fetchAthletesRef = useRef(fetchAthletes);
  useEffect(() => {
    fetchAthletesRef.current = fetchAthletes;
  }, [fetchAthletes]);

  useEffect(() => {
    if (!user || !activeCoachId) return;

    const channel = supabase.channel(
      `athletes-realtime-${activeCoachId}-${Math.random().toString(36).slice(2, 8)}`
    );

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "profiles", filter: `coach_id=eq.${activeCoachId}` },
      () => fetchAthletesRef.current(),
    );
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "daily_checkins" },
      () => fetchAthletesRef.current(),
    );
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "workout_logs" },
      () => fetchAthletesRef.current(),
    );
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "orders" },
      () => fetchAthletesRef.current(),
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeCoachId]);

  return { athletes, isLoading, error, refetch: fetchAthletes };
}

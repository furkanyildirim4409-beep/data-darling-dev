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

function mapProfileToAthlete(row: any): Athlete {
  return {
    id: row.id,
    name: row.full_name || "İsimsiz",
    email: row.email || "",
    phone: "",
    avatar: row.avatar_url || undefined,
    sport: "",
    tier: "Standard",
    compliance: 80,
    readiness: row.readiness_score ?? 75,
    injuryRisk: "Low",
    checkInStatus: "pending",
    bloodworkStatus: "pending",
    subscriptionExpiry: "",
    currentCalories: 0,
    currentProtein: 0,
    currentProgram: "",
    currentDiet: "",
    joinDate: row.created_at ?? "",
    lastActive: row.updated_at ?? "",
  };
}

export function useAthletes(): UseAthletesReturn {
  const { user, activeCoachId, isSubCoach, teamMember, teamMemberPermissions } = useAuth();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable primitive extractions
  const teamMemberId = teamMember?.id ?? null;

  // Ref to track the latest activeCoachId for stale-closure protection
  const activeCoachIdRef = useRef(activeCoachId);
  useEffect(() => {
    activeCoachIdRef.current = activeCoachId;
  }, [activeCoachId]);

  const fetchAthletes = useCallback(async () => {
    // Guard: skip fetch if coachId hasn't stabilized yet
    if (!user || !activeCoachId) {
      return;
    }

    const coachIdAtRequest = activeCoachId;

    try {
      setError(null);
      setIsLoading(true);

      // Data scoping for sub-coaches without full permissions
      let assignedIds: string[] | null = null;
      if (isSubCoach && teamMemberPermissions !== 'full' && teamMemberId) {
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("team_member_athletes")
          .select("athlete_id")
          .eq("team_member_id", teamMemberId);

        // Stale check after async
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

      // Stale check after async — discard if coachId changed mid-flight
      if (activeCoachIdRef.current !== coachIdAtRequest) return;

      if (fetchError) throw fetchError;

      setAthletes((data || []).map(mapProfileToAthlete));
    } catch (err: any) {
      // Only set error if still relevant
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

  // Realtime subscription with unique channel name
  useEffect(() => {
    if (!user || !activeCoachId) return;

    const channel = supabase
      .channel(`athletes-realtime-${activeCoachId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `coach_id=eq.${activeCoachId}`,
        },
        () => {
          fetchAthletes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeCoachId, fetchAthletes]);

  return { athletes, isLoading, error, refetch: fetchAthletes };
}

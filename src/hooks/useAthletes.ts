import { useEffect, useState, useCallback } from "react";
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

  const fetchAthletes = useCallback(async () => {
    if (!user || !activeCoachId) {
      setAthletes([]);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      // Data scoping for sub-coaches without full permissions
      let assignedIds: string[] | null = null;
      if (isSubCoach && teamMemberPermissions !== 'full' && teamMember?.id) {
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("team_member_athletes")
          .select("athlete_id")
          .eq("team_member_id", teamMember.id);

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
        .eq("coach_id", activeCoachId);

      if (assignedIds && assignedIds.length > 0) {
        query = query.in('id', assignedIds);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setAthletes((data || []).map(mapProfileToAthlete));
    } catch (err: any) {
      console.error("Failed to fetch athletes:", err);
      setError(err.message || "Sporcular yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  }, [user, activeCoachId, isSubCoach, teamMember, teamMemberPermissions]);

  useEffect(() => {
    fetchAthletes();
  }, [fetchAthletes]);

  // Realtime subscription
  useEffect(() => {
    if (!user || !activeCoachId) return;

    const channel = supabase
      .channel("athletes-realtime")
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

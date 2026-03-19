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
  const { user, activeCoachId } = useAuth();
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

      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "athlete")
        .eq("coach_id", activeCoachId);

      if (fetchError) throw fetchError;

      setAthletes((data || []).map(mapProfileToAthlete));
    } catch (err: any) {
      console.error("Failed to fetch athletes:", err);
      setError(err.message || "Sporcular yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  }, [user, activeCoachId]);

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

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Athlete } from "@/types/shared-models";
import { mockAthletes } from "@/data/athletes";

interface UseAthletesReturn {
  athletes: Athlete[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const ATHLETES_STORAGE_KEY = "dynabolic_athletes";

function getStoredAthletes(): Athlete[] | null {
  try {
    const raw = localStorage.getItem(ATHLETES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useAthletes(): UseAthletesReturn {
  const { user } = useAuth();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAthletes = useCallback(async () => {
    if (!user) {
      setAthletes([]);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const stored = getStoredAthletes();
      if (stored) {
        setAthletes(stored);
      } else {
        // Seed with mock data on first load
        localStorage.setItem(ATHLETES_STORAGE_KEY, JSON.stringify(mockAthletes));
        setAthletes(mockAthletes);
      }
    } catch (err: any) {
      console.error("Failed to fetch athletes:", err);
      setError(err.message || "Sporcular yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAthletes();
  }, [fetchAthletes]);

  return { athletes, isLoading, error, refetch: fetchAthletes };
}

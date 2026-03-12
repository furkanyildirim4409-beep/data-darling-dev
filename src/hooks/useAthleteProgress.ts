import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export interface ProgressDataPoint {
  date: string;
  rawDate: string;
  weight?: number;
  bodyFat?: number;
}

export function useAthleteProgress(athleteId: string) {
  const [data, setData] = useState<ProgressDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!athleteId) return;

    const fetch = async () => {
      setIsLoading(true);

      const [weightRes, bodyRes] = await Promise.all([
        supabase
          .from("weight_logs")
          .select("weight_kg, logged_at")
          .eq("user_id", athleteId)
          .order("logged_at", { ascending: true }),
        supabase
          .from("body_measurements")
          .select("body_fat_pct, logged_at")
          .eq("user_id", athleteId)
          .order("logged_at", { ascending: true }),
      ]);

      const map = new Map<string, { weight?: number; bodyFat?: number }>();

      weightRes.data?.forEach((w) => {
        if (!w.logged_at) return;
        const key = w.logged_at.slice(0, 10);
        const existing = map.get(key) || {};
        existing.weight = Number(w.weight_kg);
        map.set(key, existing);
      });

      bodyRes.data?.forEach((b) => {
        if (!b.logged_at) return;
        const key = b.logged_at.slice(0, 10);
        const existing = map.get(key) || {};
        existing.bodyFat = b.body_fat_pct != null ? Number(b.body_fat_pct) : undefined;
        map.set(key, existing);
      });

      const sorted = Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => ({
          date: format(new Date(key), "dd MMM", { locale: tr }),
          rawDate: key,
          ...val,
        }));

      setData(sorted);
      setIsLoading(false);
    };

    fetch();
  }, [athleteId]);

  return { data, isLoading };
}

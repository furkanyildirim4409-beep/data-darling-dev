import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useDisputes = () => {
  return useQuery({
    queryKey: ["disputes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select(
          "*, challenger:profiles!challenger_id(full_name, avatar_url), opponent:profiles!opponent_id(full_name, avatar_url)"
        )
        .eq("status", "disputed")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((c: any) => ({
        ...c,
        challengerName: c.challenger?.full_name ?? "Bilinmeyen",
        challengerAvatar: c.challenger?.avatar_url ?? null,
        opponentName: c.opponent?.full_name ?? "Bilinmeyen",
        opponentAvatar: c.opponent?.avatar_url ?? null,
      }));
    },
  });
};

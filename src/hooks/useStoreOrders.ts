import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useStoreOrders() {
  const { user, activeCoachId } = useAuth();

  const query = useQuery({
    queryKey: ["store-orders", activeCoachId ?? user?.id],
    queryFn: async () => {
      const coachId = activeCoachId ?? user?.id;
      if (!coachId) return [];

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("coach_id", coachId)
        .neq("status", "awaiting_payment")
        .neq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  return {
    orders: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}

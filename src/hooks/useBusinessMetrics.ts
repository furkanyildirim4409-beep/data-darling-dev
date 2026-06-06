import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessMetrics {
  total_package_revenue: number;
  coaching_revenue: number;
  shopify_revenue: number;
  digital_revenue: number;
  other_revenue: number;
  total_store_revenue: number;
  pending_custom_revenue: number;
  paid_custom_revenue: number;
  total_revenue: number;
  active_athletes: number;
}

export function useBusinessMetrics(coachId?: string) {
  return useQuery<BusinessMetrics | null>({
    queryKey: ["business_metrics", coachId],
    queryFn: async () => {
      if (!coachId) return null;
      const { data, error } = await supabase.rpc("get_coach_business_metrics", {
        coach_uuid: coachId,
      });
      if (error) throw error;
      return data as unknown as BusinessMetrics;
    },
    enabled: !!coachId,
    staleTime: 60_000,
  });
}

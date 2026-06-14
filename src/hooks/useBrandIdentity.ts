import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Resolves the *head coach's* business/gym name regardless of who is signed in.
 * - Head coach -> their own gym_name from profile.
 * - Sub-coach  -> head coach's gym_name via get_coach_info(activeCoachId).
 */
export function useBrandIdentity() {
  const { profile, isSubCoach, activeCoachId } = useAuth();

  const ownGymName = profile?.gym_name ?? null;

  const { data: parentBrand } = useQuery({
    queryKey: ["brand-identity", activeCoachId],
    enabled: Boolean(isSubCoach && activeCoachId),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_coach_info", {
        _coach_id: activeCoachId as string,
      });
      if (error) throw error;
      const info = (data ?? {}) as { gym_name?: string | null };
      return info.gym_name ?? null;
    },
  });

  const businessName = isSubCoach ? parentBrand ?? null : ownGymName;
  return { businessName };
}

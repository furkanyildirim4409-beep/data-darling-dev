import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResolveDisputeParams {
  p_challenge_id: string;
  p_winner_id: string | null;
  p_is_draw: boolean;
}

export const useResolveDispute = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  const { mutate: resolveDispute, isPending: isResolving } = useMutation({
    mutationFn: async (params: ResolveDisputeParams) => {
      const { data, error } = await (supabase.rpc as any)("resolve_dispute", params);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Karar verildi! ⚖️");
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error("Karar verilemedi: " + (error.message || "Bilinmeyen hata"));
    },
  });

  return { resolveDispute, isResolving };
};

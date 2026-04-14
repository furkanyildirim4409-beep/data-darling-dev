import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useEmails(direction: "inbound" | "outbound") {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["emails", user?.id, direction],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("emails")
        .select("*")
        .eq("owner_id", user.id)
        .eq("direction", direction)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const markAsRead = useMutation({
    mutationFn: async (emailId: string) => {
      const { error } = await supabase
        .from("emails")
        .update({ is_read: true } as any)
        .eq("id", emailId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails", user?.id, direction] });
      queryClient.invalidateQueries({ queryKey: ["unread-emails"] });
    },
  });

  return { emails, isLoading, markAsRead };
}

export function useSendEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { toEmail: string; subject: string; bodyText: string }) => {
      const { data, error } = await supabase.functions.invoke("send-custom-email", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Email = {
  id: string;
  owner_id: string;
  direction: string;
  from_email: string;
  to_email: string;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  is_read: boolean | null;
  created_at: string;
};

export function useEmails(direction: "inbound" | "outbound") {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["emails", user?.id, direction],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("emails")
        .select("*")
        .eq("owner_id", user.id)
        .eq("direction", direction)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Email[];
    },
    enabled: !!user?.id,
  });

  const markAsRead = useMutation({
    mutationFn: async (emailId: string) => {
      const { error } = await supabase
        .from("emails")
        .update({ is_read: true })
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

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUnreadEmails() {
  const { user } = useAuth();

  const { data: count = 0 } = useQuery({
    queryKey: ["unread-emails", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("emails")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("direction", "inbound")
        .eq("is_read", false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  return { unreadCount: count };
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUnreadEmails() {
  const { user } = useAuth();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-emails", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from("emails")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("is_read", false)
        .eq("direction", "inbound");
      return count ?? 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  return { unreadCount };
}

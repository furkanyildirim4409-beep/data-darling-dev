import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useEmailTemplates() {
  const { user } = useAuth();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["email-templates", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("is_system", { ascending: false })
        .order("category")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return { templates, isLoading };
}

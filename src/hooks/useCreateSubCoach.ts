import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CreateSubCoachInput {
  email: string;
  password: string;
  fullName: string;
  role: string;
  permissions: "full" | "limited" | "read-only";
}

export function useCreateSubCoach() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSubCoachInput) => {
      const { data, error } = await supabase.functions.invoke("create-sub-coach", {
        body: {
          email: input.email,
          password: input.password,
          fullName: input.fullName,
          role: input.role,
          permissions: input.permissions,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
}

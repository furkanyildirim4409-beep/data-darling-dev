import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { GranularPermissions } from "@/types/permissions";

interface CreateSubCoachInput {
  email: string;
  password: string;
  fullName: string;
  role: string;
  permissions: "full" | "limited" | "read-only";
  custom_permissions?: GranularPermissions;
  username?: string;
}

export function useCreateSubCoach() {
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
          custom_permissions: input.custom_permissions || null,
          username: input.username || null,
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

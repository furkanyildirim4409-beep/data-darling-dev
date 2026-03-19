import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TeamMember } from "@/components/team/MemberProfileDrawer";
import { format } from "date-fns";

interface TeamMemberRow {
  id: string;
  head_coach_id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  role: string;
  phone: string | null;
  avatar_url: string | null;
  permissions: string;
  status: string;
  athletes_count: number;
  start_date: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToTeamMember(row: TeamMemberRow): TeamMember {
  return {
    id: row.id,
    name: row.full_name,
    role: row.role,
    email: row.email,
    phone: row.phone || "",
    avatar: row.avatar_url || "",
    permissions: row.permissions as "full" | "limited" | "read-only",
    athletes: row.athletes_count,
    startDate: row.start_date
      ? format(new Date(row.start_date), "dd.MM.yyyy")
      : undefined,
  };
}

export function useTeamMembers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("head_coach_id", user!.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data as TeamMemberRow[]).map(mapRowToTeamMember);
    },
    enabled: !!user,
  });
}

interface AddTeamMemberInput {
  full_name: string;
  email: string;
  role: string;
  permissions: "full" | "limited" | "read-only";
  phone?: string;
  start_date?: string | null; // ISO date string
}

export function useAddTeamMember() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddTeamMemberInput) => {
      const { data, error } = await supabase
        .from("team_members")
        .insert({
          head_coach_id: user!.id,
          full_name: input.full_name,
          email: input.email,
          role: input.role,
          permissions: input.permissions,
          phone: input.phone || "",
          start_date: input.start_date || null,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
}

interface UpdateTeamMemberInput {
  id: string;
  full_name?: string;
  email?: string;
  role?: string;
  permissions?: "full" | "limited" | "read-only";
  phone?: string;
  athletes_count?: number;
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTeamMemberInput) => {
      const { data, error } = await supabase
        .from("team_members")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
}

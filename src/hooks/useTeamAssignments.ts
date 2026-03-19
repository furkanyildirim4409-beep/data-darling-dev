import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTeamMemberAssignments(teamMemberId: string) {
  return useQuery({
    queryKey: ["team-assignments", teamMemberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_member_athletes")
        .select("athlete_id")
        .eq("team_member_id", teamMemberId);

      if (error) throw error;
      return (data || []).map((row) => row.athlete_id);
    },
    enabled: !!teamMemberId,
  });
}

interface UpdateAssignmentsParams {
  teamMemberId: string;
  headCoachId: string;
  athleteIds: string[];
}

export function useUpdateTeamMemberAssignments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamMemberId, headCoachId, athleteIds }: UpdateAssignmentsParams) => {
      // Step 1: Delete all existing assignments
      const { error: deleteError } = await supabase
        .from("team_member_athletes")
        .delete()
        .eq("team_member_id", teamMemberId);

      if (deleteError) throw deleteError;

      // Step 2: Insert new assignments
      if (athleteIds.length > 0) {
        const rows = athleteIds.map((athleteId) => ({
          head_coach_id: headCoachId,
          team_member_id: teamMemberId,
          athlete_id: athleteId,
        }));

        const { error: insertError } = await supabase
          .from("team_member_athletes")
          .insert(rows);

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["team-assignments", variables.teamMemberId] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
}

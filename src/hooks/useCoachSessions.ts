import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";

export interface CoachSession {
  id: string;
  coach_id: string;
  athlete_id: string | null;
  athlete_label: string;
  session_type: string;
  scheduled_date: string; // yyyy-MM-dd
  scheduled_time: string; // HH:mm:ss
  duration_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewSessionInput {
  coach_id: string;
  athlete_id: string | null;
  athlete_label: string;
  session_type: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  notes?: string | null;
}

export function useCoachSessions(coachId?: string | null, date?: Date) {
  const dateStr = date ? format(date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
  return useQuery({
    queryKey: ["coach_sessions", coachId, dateStr],
    enabled: !!coachId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_sessions" as any)
        .select("*")
        .eq("coach_id", coachId as string)
        .eq("scheduled_date", dateStr)
        .order("scheduled_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CoachSession[];
    },
  });
}

export function useCoachSessionsWeek(coachId?: string | null, weekStart?: Date) {
  const start = weekStart ?? new Date();
  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(addDays(start, 6), "yyyy-MM-dd");
  return useQuery({
    queryKey: ["coach_sessions_week", coachId, startStr],
    enabled: !!coachId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_sessions" as any)
        .select("*")
        .eq("coach_id", coachId as string)
        .gte("scheduled_date", startStr)
        .lte("scheduled_date", endStr)
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CoachSession[];
    },
  });
}

export function useCreateCoachSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewSessionInput) => {
      const { data, error } = await supabase
        .from("coach_sessions" as any)
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CoachSession;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach_sessions"] });
      qc.invalidateQueries({ queryKey: ["coach_sessions_week"] });
    },
  });
}

export function useDeleteCoachSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coach_sessions" as any).delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach_sessions"] });
      qc.invalidateQueries({ queryKey: ["coach_sessions_week"] });
    },
  });
}

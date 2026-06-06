import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AssignedInvoice {
  id: string;
  title: string;
  amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  athlete_id: string;
  athlete_name: string;
  athlete_avatar_url: string | null;
}

export function useAssignedPayments(coachId?: string) {
  return useQuery<AssignedInvoice[]>({
    queryKey: ["assigned_payments_history", coachId],
    queryFn: async () => {
      if (!coachId) return [];

      const { data: invoices, error } = await supabase
        .from("assigned_payments")
        .select("id, title, amount, status, created_at, paid_at, athlete_id")
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const rows = invoices ?? [];
      if (rows.length === 0) return [];

      const athleteIds = Array.from(new Set(rows.map((r) => r.athlete_id).filter(Boolean)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", athleteIds);

      const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      return rows.map((r) => {
        const p: any = nameMap.get(r.athlete_id);
        return {
          id: r.id,
          title: r.title,
          amount: Number(r.amount),
          status: r.status,
          created_at: r.created_at,
          paid_at: r.paid_at,
          athlete_id: r.athlete_id,
          athlete_name: p?.full_name || "Bilinmeyen Sporcu",
          athlete_avatar_url: p?.avatar_url ?? null,
        };
      });
    },
    enabled: !!coachId,
    staleTime: 30_000,
  });
}

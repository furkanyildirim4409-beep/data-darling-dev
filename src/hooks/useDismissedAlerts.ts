import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const KEY = (coachId: string | null | undefined) => ["dismissed_alerts", coachId];

export function useDismissedAlerts() {
  const { user } = useAuth();
  const coachId = user?.id ?? null;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY(coachId),
    enabled: !!coachId,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("dismissed_alerts" as any)
        .select("alert_key")
        .eq("coach_id", coachId as string);
      if (error) throw error;
      return new Set(((data ?? []) as any[]).map((r) => r.alert_key as string));
    },
  });

  useEffect(() => {
    if (!coachId) return;
    const channel = supabase
      .channel(`dismissed-alerts:${coachId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dismissed_alerts", filter: `coach_id=eq.${coachId}` },
        () => qc.invalidateQueries({ queryKey: KEY(coachId) }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [coachId, qc]);

  const dismiss = useMutation({
    mutationFn: async (alertKey: string) => {
      if (!coachId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("dismissed_alerts" as any)
        .upsert(
          { coach_id: coachId, alert_key: alertKey, resolved_at: new Date().toISOString() },
          { onConflict: "coach_id,alert_key" },
        );
      if (error) throw error;
      return alertKey;
    },
    onSuccess: (alertKey) => {
      qc.setQueryData<Set<string>>(KEY(coachId), (prev) => {
        const next = new Set(prev ?? []);
        next.add(alertKey);
        return next;
      });
    },
  });

  const undismiss = useMutation({
    mutationFn: async (alertKey: string) => {
      if (!coachId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("dismissed_alerts" as any)
        .delete()
        .eq("coach_id", coachId)
        .eq("alert_key", alertKey);
      if (error) throw error;
      return alertKey;
    },
    onSuccess: (alertKey) => {
      qc.setQueryData<Set<string>>(KEY(coachId), (prev) => {
        const next = new Set(prev ?? []);
        next.delete(alertKey);
        return next;
      });
    },
  });

  return {
    dismissedKeys: query.data ?? new Set<string>(),
    isLoading: query.isLoading,
    dismissAsync: (alertKey: string) => dismiss.mutateAsync(alertKey),
    undismissAsync: (alertKey: string) => undismiss.mutateAsync(alertKey),
  };
}

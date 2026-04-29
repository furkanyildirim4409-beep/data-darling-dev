import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CoachNotificationType = "order" | "compliance_alert" | "message" | "system";

export interface CoachNotification {
  id: string;
  coach_id: string;
  athlete_id: string | null;
  type: CoachNotificationType;
  title: string;
  message: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

const QUERY_KEY = (userId: string) => ["coach-notifications", userId] as const;

export function useCoachNotifications() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: userId ? QUERY_KEY(userId) : ["coach-notifications", "anon"],
    enabled: !!userId,
    queryFn: async (): Promise<CoachNotification[]> => {
      const { data, error } = await supabase
        .from("coach_notifications" as any)
        .select("*")
        .eq("coach_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as CoachNotification[];
    },
  });

  // Realtime subscription — attach listener BEFORE subscribe (Core memory rule)
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`coach-notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "coach_notifications",
          filter: `coach_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: QUERY_KEY(userId) });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  const notifications = query.data ?? [];

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  );

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("coach_notifications" as any)
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      if (!userId) return;
      await qc.cancelQueries({ queryKey: QUERY_KEY(userId) });
      const prev = qc.getQueryData<CoachNotification[]>(QUERY_KEY(userId));
      qc.setQueryData<CoachNotification[]>(QUERY_KEY(userId), (old) =>
        (old ?? []).map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (userId && ctx?.prev) qc.setQueryData(QUERY_KEY(userId), ctx.prev);
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from("coach_notifications" as any)
        .update({ is_read: true })
        .eq("coach_id", userId)
        .eq("is_read", false);
      if (error) throw error;
    },
    onMutate: async () => {
      if (!userId) return;
      await qc.cancelQueries({ queryKey: QUERY_KEY(userId) });
      const prev = qc.getQueryData<CoachNotification[]>(QUERY_KEY(userId));
      qc.setQueryData<CoachNotification[]>(QUERY_KEY(userId), (old) =>
        (old ?? []).map((n) => ({ ...n, is_read: true })),
      );
      return { prev };
    },
    onError: (_err, _v, ctx) => {
      if (userId && ctx?.prev) qc.setQueryData(QUERY_KEY(userId), ctx.prev);
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    markAsRead: (id: string) => markAsRead.mutate(id),
    markAllAsRead: () => markAllAsRead.mutate(),
  };
}

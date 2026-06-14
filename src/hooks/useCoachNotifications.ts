import { useEffect, useMemo, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CoachNotificationType =
  | "message"
  | "system"
  | "payment"
  | "ticket"
  | "compliance_alert"
  | "order";

export interface NotificationItem {
  id: string; // namespaced: "msg:<uuid>" | "ledger:<uuid>" | "pay:<uuid>" | "ticket:<uuid>" | "notif:<uuid>"
  title: string;
  description: string;
  created_at: string;
  type: CoachNotificationType;
  read_status: boolean;
  redirect_url: string | null;
}

const QUERY_KEY = (uid: string) => ["coach-master-notifications", uid] as const;
const SEEN_KEY = (uid: string) => `coach-notif-seen:${uid}`;

function loadSeen(uid: string): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY(uid));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}
function persistSeen(uid: string, set: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY(uid), JSON.stringify([...set].slice(-500)));
  } catch {
    /* ignore quota errors */
  }
}

function truncate(text: string | null | undefined, n = 120): string {
  if (!text) return "";
  return text.length > n ? text.slice(0, n - 1) + "…" : text;
}

export function useCoachNotifications() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();

  const [seenLocal, setSeenLocal] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    setSeenLocal(loadSeen(userId));
  }, [userId]);

  const query = useQuery({
    queryKey: userId ? QUERY_KEY(userId) : ["coach-master-notifications", "anon"],
    enabled: !!userId,
    queryFn: async (): Promise<NotificationItem[]> => {
      const uid = userId!;

      const [msgsRes, ledgerRes, paymentsRes, ticketsRes, notifsRes] = await Promise.all([
        supabase
          .from("messages")
          .select("id, sender_id, content, created_at, is_read, is_deleted")
          .eq("receiver_id", uid)
          .eq("is_read", false)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("coach_action_ledger")
          .select("id, athlete_id, issue_title, issue_type, status, created_at")
          .eq("coach_id", uid)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("assigned_payments")
          .select("id, title, amount, currency, status, paid_at, updated_at, created_at")
          .eq("coach_id", uid)
          .order("updated_at", { ascending: false })
          .limit(20),
        supabase
          .from("tickets")
          .select("id, subject, status, priority, created_at")
          .eq("coach_id", uid)
          .in("status", ["open", "awaiting_coach", "pending"])
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("coach_notifications" as any)
          .select("*")
          .eq("coach_id", uid)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

      // Resolve sender names for messages
      const senderIds = Array.from(
        new Set((msgsRes.data ?? []).map((m: any) => m.sender_id).filter(Boolean)),
      );
      let senderMap: Record<string, string> = {};
      if (senderIds.length > 0) {
        const { data: senders } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", senderIds);
        senderMap = Object.fromEntries(
          (senders ?? []).map((s: any) => [s.id, s.full_name ?? "Sporcu"]),
        );
      }

      const items: NotificationItem[] = [];

      // 1) Messages
      for (const m of msgsRes.data ?? []) {
        items.push({
          id: `msg:${m.id}`,
          type: "message",
          title: `Yeni mesaj — ${senderMap[(m as any).sender_id] ?? "Sporcu"}`,
          description: truncate((m as any).content),
          created_at: (m as any).created_at,
          read_status: false,
          redirect_url: `/messages?athlete=${(m as any).sender_id}`,
        });
      }

      // 2) Action ledger (pending)
      for (const l of ledgerRes.data ?? []) {
        items.push({
          id: `ledger:${l.id}`,
          type: "compliance_alert",
          title: (l as any).issue_title ?? "Uyumluluk uyarısı",
          description: (l as any).issue_type ?? "Bekleyen aksiyon",
          created_at: (l as any).created_at,
          read_status: false,
          redirect_url: (l as any).athlete_id ? `/athletes/${(l as any).athlete_id}` : null,
        });
      }

      // 3) Payments — recent paid rows
      for (const p of paymentsRes.data ?? []) {
        if ((p as any).status !== "paid") continue;
        const id = `pay:${p.id}`;
        items.push({
          id,
          type: "payment",
          title: `Ödeme alındı — ${(p as any).title ?? "Fatura"}`,
          description: `${(p as any).amount ?? ""} ${(p as any).currency ?? ""}`.trim(),
          created_at: (p as any).paid_at ?? (p as any).updated_at ?? (p as any).created_at,
          read_status: false,
          redirect_url: `/payments`,
        });
      }

      // 4) Tickets
      for (const t of ticketsRes.data ?? []) {
        items.push({
          id: `ticket:${t.id}`,
          type: "ticket",
          title: `Destek talebi — ${(t as any).subject ?? "Yeni talep"}`,
          description: `Durum: ${(t as any).status}`,
          created_at: (t as any).created_at,
          read_status: false,
          redirect_url: `/support/${t.id}`,
        });
      }

      // 5) Existing coach_notifications
      for (const n of (notifsRes.data ?? []) as any[]) {
        const t = (n.type as string) ?? "system";
        items.push({
          id: `notif:${n.id}`,
          type: (["order", "compliance_alert", "message", "system", "payment", "ticket"].includes(t)
            ? t
            : "system") as CoachNotificationType,
          title: n.title ?? "Bildirim",
          description: n.message ?? "",
          created_at: n.created_at,
          read_status: !!n.is_read,
          redirect_url: n.action_url ?? null,
        });
      }

      items.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      return items.slice(0, 50);
    },
  });

  // Realtime fan-out
  useEffect(() => {
    if (!userId) return;
    const invalidate = () =>
      qc.invalidateQueries({ queryKey: QUERY_KEY(userId) });

    const channel = supabase.channel(`coach-master-notif:${userId}`);
    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coach_notifications", filter: `coach_id=eq.${userId}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coach_action_ledger", filter: `coach_id=eq.${userId}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assigned_payments", filter: `coach_id=eq.${userId}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets", filter: `coach_id=eq.${userId}` },
        invalidate,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  const notifications = useMemo<NotificationItem[]>(() => {
    const raw = query.data ?? [];
    return raw.map((n) =>
      n.read_status || seenLocal.has(n.id) ? { ...n, read_status: true } : n,
    );
  }, [query.data, seenLocal]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_status).length,
    [notifications],
  );

  const markAsRead = useCallback(
    async (id: string) => {
      if (!userId) return;
      // Optimistic local seen
      setSeenLocal((prev) => {
        const next = new Set(prev);
        next.add(id);
        persistSeen(userId, next);
        return next;
      });

      const [kind, raw] = id.split(":");
      try {
        if (kind === "notif") {
          await supabase
            .from("coach_notifications" as any)
            .update({ is_read: true })
            .eq("id", raw);
        } else if (kind === "msg") {
          await supabase.from("messages").update({ is_read: true }).eq("id", raw);
        }
      } catch {
        /* swallow — local seen still hides badge */
      }
    },
    [userId],
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    const ids = (query.data ?? []).map((n) => n.id);
    setSeenLocal((prev) => {
      const next = new Set(prev);
      ids.forEach((i) => next.add(i));
      persistSeen(userId, next);
      return next;
    });
    try {
      await supabase
        .from("coach_notifications" as any)
        .update({ is_read: true })
        .eq("coach_id", userId)
        .eq("is_read", false);
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("receiver_id", userId)
        .eq("is_read", false);
    } catch {
      /* ignore */
    }
  }, [userId, query.data]);

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    markAsRead,
    markAllAsRead,
  };
}

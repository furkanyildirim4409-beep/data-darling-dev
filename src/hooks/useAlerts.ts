import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Notification } from "@/types/shared-models";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Şimdi";
  if (mins < 60) return `${mins}dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa önce`;
  const days = Math.floor(hours / 24);
  return `${days}g önce`;
}

export function useAlerts() {
  const { user, activeCoachId, isSubCoach, teamMember, teamMemberPermissions } = useAuth();
  const [alerts, setAlerts] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!user || !activeCoachId) {
      setAlerts([]);
      setIsLoading(false);
      return;
    }

    // Assignment scoping for restricted sub-coaches
    let assignedIds: string[] | null = null;
    if (isSubCoach && teamMemberPermissions !== 'full' && teamMember?.id) {
      const { data: assignmentData } = await supabase
        .from("team_member_athletes")
        .select("athlete_id")
        .eq("team_member_id", teamMember.id);

      if (!assignmentData || assignmentData.length === 0) {
        setAlerts([]);
        setIsLoading(false);
        return;
      }
      assignedIds = assignmentData.map(a => a.athlete_id);
    }

    const coachId = activeCoachId;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    let profilesQuery = supabase
      .from("profiles")
      .select("id, full_name, readiness_score, updated_at")
      .eq("coach_id", coachId)
      .eq("role", "athlete");

    if (assignedIds) {
      profilesQuery = profilesQuery.in("id", assignedIds);
    }

    const [profilesRes, workoutsRes, checkinsRes, paymentsRes] = await Promise.all([
      profilesQuery,
      supabase
        .from("assigned_workouts")
        .select("id, status, athlete_id")
        .eq("coach_id", coachId)
        .gte("scheduled_date", sevenDaysAgo),
      supabase
        .from("daily_checkins")
        .select("id, user_id, created_at")
        .gte("created_at", fortyEightHoursAgo),
      supabase
        .from("payments")
        .select("id, athlete_id, status, payment_date, amount")
        .eq("coach_id", coachId)
        .eq("status", "overdue"),
    ]);

    const profiles = profilesRes.data ?? [];
    const workouts = workoutsRes.data ?? [];
    const checkins = checkinsRes.data ?? [];
    const overduePayments = paymentsRes.data ?? [];

    const athleteIds = new Set(profiles.map((p) => p.id));
    const nameMap = new Map(profiles.map((p) => [p.id, p.full_name || "İsimsiz"]));

    // Compliance per athlete
    const compMap = new Map<string, { total: number; completed: number }>();
    for (const w of workouts) {
      if (!w.athlete_id) continue;
      const e = compMap.get(w.athlete_id) ?? { total: 0, completed: 0 };
      e.total++;
      if (w.status === "completed") e.completed++;
      compMap.set(w.athlete_id, e);
    }

    // Check-in set (last 48h)
    const checkedIn = new Set(
      checkins.filter((c) => athleteIds.has(c.user_id)).map((c) => c.user_id)
    );

    const generated: Notification[] = [];
    let idCounter = 1;

    // --- HEALTH ALERTS: readiness < 50 ---
    for (const p of profiles) {
      const score = p.readiness_score ?? 75;
      if (score < 30) {
        generated.push({
          id: `health-crit-${p.id}`,
          type: "health",
          level: "critical",
          title: `${nameMap.get(p.id)} - Kritik Düşük Hazırlık`,
          message: `Hazırlık skoru ${score}/100. Antrenman yükü derhal azaltılmalı.`,
          time: timeAgo(p.updated_at ?? new Date().toISOString()),
          athleteId: p.id,
        });
      } else if (score < 50) {
        generated.push({
          id: `health-warn-${p.id}`,
          type: "health",
          level: "warning",
          title: `${nameMap.get(p.id)} - Düşük Hazırlık`,
          message: `Hazırlık skoru ${score}/100. Toparlanma programı önerilir.`,
          time: timeAgo(p.updated_at ?? new Date().toISOString()),
          athleteId: p.id,
        });
      }
    }

    // --- COMPLIANCE ALERTS: < 50% ---
    for (const p of profiles) {
      const comp = compMap.get(p.id);
      if (!comp || comp.total === 0) continue;
      const pct = Math.round((comp.completed / comp.total) * 100);
      if (pct < 30) {
        generated.push({
          id: `comp-crit-${p.id}`,
          type: "program",
          level: "critical",
          title: `${nameMap.get(p.id)} - Çok Düşük Uyumluluk`,
          message: `Son 7 günde uyumluluk %${pct}. Programı gözden geçirin.`,
          time: timeAgo(p.updated_at ?? new Date().toISOString()),
          athleteId: p.id,
        });
      } else if (pct < 50) {
        generated.push({
          id: `comp-warn-${p.id}`,
          type: "program",
          level: "warning",
          title: `${nameMap.get(p.id)} - Düşük Uyumluluk`,
          message: `Son 7 günde uyumluluk %${pct}. Takip önerilir.`,
          time: timeAgo(p.updated_at ?? new Date().toISOString()),
          athleteId: p.id,
        });
      }
    }

    // --- CHECK-IN ALERTS: no check-in in 48h ---
    for (const p of profiles) {
      if (!checkedIn.has(p.id)) {
        generated.push({
          id: `checkin-${p.id}`,
          type: "checkin",
          level: "warning",
          title: `Check-in Eksik: ${nameMap.get(p.id)}`,
          message: `48 saattir check-in yapılmadı. Hatırlatma gönderilmeli.`,
          time: "48sa+",
          athleteId: p.id,
        });
      }
    }

    // --- PAYMENT ALERTS: overdue ---
    for (const pay of overduePayments) {
      const name = nameMap.get(pay.athlete_id) ?? "Sporcu";
      generated.push({
        id: `pay-${pay.id}`,
        type: "payment",
        level: "critical",
        title: `Ödeme Gecikmiş - ${name}`,
        message: `${Number(pay.amount).toLocaleString("tr-TR")} TL ödeme gecikti.`,
        time: timeAgo(pay.payment_date),
        athleteId: pay.athlete_id,
      });
    }

    // Sort: critical first, then warning, then info
    const levelOrder = { critical: 0, warning: 1, info: 2 };
    generated.sort((a, b) => (levelOrder[a.level ?? "info"] ?? 2) - (levelOrder[b.level ?? "info"] ?? 2));

    setAlerts(generated);
    setIsLoading(false);
  }, [user, activeCoachId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Realtime: re-scan when profiles or checkins change
  useEffect(() => {
    if (!user || !activeCoachId) return;

    const channel = supabase
      .channel("alerts-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => fetchAlerts())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "daily_checkins" }, () => fetchAlerts())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "assigned_workouts" }, () => fetchAlerts())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "assigned_workouts" }, () => fetchAlerts())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeCoachId, fetchAlerts]);

  // Derived counts
  const criticalCount = alerts.filter((a) => a.level === "critical").length;
  const warningCount = alerts.filter((a) => a.level === "warning").length;
  const infoCount = alerts.filter((a) => a.level === "info").length;

  const healthAlerts = alerts.filter((a) => a.type === "health");
  const paymentAlerts = alerts.filter((a) => a.type === "payment");
  const programAlerts = alerts.filter((a) => a.type === "program");
  const checkinAlerts = alerts.filter((a) => a.type === "checkin");

  return {
    alerts,
    isLoading,
    criticalCount,
    warningCount,
    infoCount,
    healthAlerts,
    paymentAlerts,
    programAlerts,
    checkinAlerts,
  };
}

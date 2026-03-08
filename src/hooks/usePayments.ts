import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Payment {
  id: string;
  coach_id: string;
  athlete_id: string;
  athlete_name?: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  payment_date: string;
  created_at: string;
}

export interface PaymentInsert {
  athlete_id: string;
  amount: number;
  description?: string;
  status?: string;
  payment_date?: string;
}

export function usePayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [athletes, setAthletes] = useState<{ id: string; full_name: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const [paymentsRes, athletesRes] = await Promise.all([
      supabase
        .from("payments")
        .select("*")
        .eq("coach_id", user.id)
        .order("payment_date", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("coach_id", user.id)
        .eq("role", "athlete"),
    ]);

    const athleteList = athletesRes.data ?? [];
    const nameMap = new Map(athleteList.map((a) => [a.id, a.full_name || "İsimsiz"]));

    const paymentList: Payment[] = ((paymentsRes.data as any[]) ?? []).map((p) => ({
      ...p,
      athlete_name: nameMap.get(p.athlete_id) ?? "Bilinmeyen",
    }));

    setPayments(paymentList);
    setAthletes(athleteList);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const addPayment = async (data: PaymentInsert) => {
    if (!user) return;

    const { error } = await supabase.from("payments").insert({
      coach_id: user.id,
      athlete_id: data.athlete_id,
      amount: data.amount,
      description: data.description || null,
      status: data.status || "paid",
      payment_date: data.payment_date || new Date().toISOString(),
    } as any);

    if (error) {
      toast.error("Ödeme kaydedilemedi: " + error.message);
      return false;
    }

    toast.success("Ödeme başarıyla kaydedildi");
    await fetchPayments();
    return true;
  };

  const updatePaymentStatus = async (paymentId: string, newStatus: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("payments")
      .update({ status: newStatus } as any)
      .eq("id", paymentId);

    if (error) {
      toast.error("Durum güncellenemedi: " + error.message);
      return false;
    }

    toast.success("Ödeme durumu güncellendi");
    await fetchPayments();
    return true;
  };

  const deletePayment = async (paymentId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("id", paymentId);

    if (error) {
      toast.error("Ödeme silinemedi: " + error.message);
      return false;
    }

    toast.success("Ödeme silindi");
    await fetchPayments();
    return true;
  };

  // Stats
  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.amount), 0);

  const totalPending = payments
    .filter((p) => p.status === "pending" || p.status === "overdue")
    .reduce((s, p) => s + Number(p.amount), 0);

  return {
    payments,
    athletes,
    isLoading,
    addPayment,
    updatePaymentStatus,
    deletePayment,
    totalPaid,
    totalPending,
    refetch: fetchPayments,
  };
}

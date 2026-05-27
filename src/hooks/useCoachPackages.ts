import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CoachingPackage {
  id: string;
  coach_id: string;
  title: string;
  description: string | null;
  price: number;
  duration_months: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PackageInput {
  title: string;
  description?: string;
  price: number;
  duration_months: number;
  features: string[];
  is_active?: boolean;
}

export function useCoachPackages() {
  const { user, activeCoachId } = useAuth();
  const [packages, setPackages] = useState<CoachingPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPackages = useCallback(async () => {
    if (!user || !activeCoachId) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from("coaching_packages")
      .select("*")
      .eq("coach_id", activeCoachId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Paketler yüklenemedi: " + error.message);
      setIsLoading(false);
      return;
    }

    const list: CoachingPackage[] = ((data as any[]) ?? []).map((p) => ({
      ...p,
      features: Array.isArray(p.features) ? p.features : [],
    }));

    setPackages(list);
    setIsLoading(false);
  }, [user, activeCoachId]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const createPackage = async (input: PackageInput) => {
    if (!user || !activeCoachId) return false;
    const { error } = await supabase.from("coaching_packages").insert({
      coach_id: activeCoachId,
      title: input.title,
      description: input.description ?? null,
      price: input.price,
      duration_months: input.duration_months,
      features: input.features as any,
      is_active: input.is_active ?? true,
    } as any);
    if (error) {
      toast.error("Paket oluşturulamadı: " + error.message);
      return false;
    }
    toast.success("Paket oluşturuldu");
    await fetchPackages();
    return true;
  };

  const updatePackage = async (id: string, input: PackageInput) => {
    if (!user) return false;
    const { error } = await supabase
      .from("coaching_packages")
      .update({
        title: input.title,
        description: input.description ?? null,
        price: input.price,
        duration_months: input.duration_months,
        features: input.features as any,
        is_active: input.is_active,
      } as any)
      .eq("id", id);
    if (error) {
      toast.error("Paket güncellenemedi: " + error.message);
      return false;
    }
    toast.success("Paket güncellendi");
    await fetchPackages();
    return true;
  };

  const deletePackage = async (id: string) => {
    if (!user) return false;
    const { error } = await supabase.from("coaching_packages").delete().eq("id", id);
    if (error) {
      toast.error("Paket silinemedi: " + error.message);
      return false;
    }
    toast.success("Paket silindi");
    await fetchPackages();
    return true;
  };

  const togglePackageActive = async (id: string, is_active: boolean) => {
    if (!user) return false;
    const { error } = await supabase
      .from("coaching_packages")
      .update({ is_active } as any)
      .eq("id", id);
    if (error) {
      toast.error("Durum güncellenemedi: " + error.message);
      return false;
    }
    await fetchPackages();
    return true;
  };

  return {
    packages,
    isLoading,
    createPackage,
    updatePackage,
    deletePackage,
    togglePackageActive,
    refetch: fetchPackages,
  };
}

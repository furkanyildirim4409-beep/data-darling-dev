import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AssignSupplementPayload {
  athleteId: string;
  name: string;
  dosage: string;
  timing: string;
  totalServings: number;
  icon: string;
}

export function useSupplementMutations() {
  const { activeCoachId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const assignSupplement = async (payload: AssignSupplementPayload) => {
    if (!activeCoachId) {
      toast.error("Coach bilgisi bulunamadı.");
      return false;
    }

    setIsLoading(true);
    const nameAndDosage = `${payload.name} - ${payload.dosage}`;

    const { error } = await supabase.from("assigned_supplements").insert({
      athlete_id: payload.athleteId,
      coach_id: activeCoachId,
      name_and_dosage: nameAndDosage,
      dosage: payload.dosage,
      timing: payload.timing,
      total_servings: payload.totalServings,
      servings_left: payload.totalServings,
      icon: payload.icon,
      is_active: true,
    });

    setIsLoading(false);

    if (error) {
      console.error("Supplement assign error:", error);
      toast.error("Takviye atanamadı.");
      return false;
    }

    toast.success("Takviye başarıyla atandı.");
    return true;
  };

  const deleteSupplement = async (id: string) => {
    const { error } = await supabase
      .from("assigned_supplements")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supplement delete error:", error);
      toast.error("Takviye silinemedi.");
      return false;
    }

    toast.success("Takviye silindi.");
    return true;
  };

  const toggleSupplement = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from("assigned_supplements")
      .update({ is_active: !currentState })
      .eq("id", id);

    if (error) {
      console.error("Supplement toggle error:", error);
      toast.error("Durum güncellenemedi.");
      return false;
    }
    return true;
  };

  return { assignSupplement, deleteSupplement, toggleSupplement, isLoading };
}

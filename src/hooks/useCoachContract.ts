import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { sanitizeRichHtml } from "@/lib/sanitizeHtml";

/** Strip HTML tags and whitespace to determine if there is any meaningful content. */
function isNonEmptyContract(value: string | null | undefined): boolean {
  if (!value) return false;
  const stripped = value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  return stripped.length > 0;
}

export function useCoachContract() {
  const { user, activeCoachId } = useAuth();
  const [contract, setContract] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const targetCoachId = activeCoachId ?? user?.id ?? null;
  const canEdit = !!user && !!targetCoachId && user.id === targetCoachId;

  const fetchContract = useCallback(async () => {
    if (!targetCoachId) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("coach_contracts")
      .select("content, updated_at")
      .eq("coach_id", targetCoachId)
      .maybeSingle();

    if (error) {
      console.error("Contract fetch error:", error);
      toast.error("Sözleşme şablonu yüklenemedi");
    } else {
      setContract(((data as any)?.content as string | null) ?? null);
      setUpdatedAt(((data as any)?.updated_at as string | null) ?? null);
    }
    setIsLoading(false);
  }, [targetCoachId]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const saveContract = useCallback(
    async (html: string) => {
      if (!canEdit || !targetCoachId) {
        toast.error("Sözleşme şablonunu yalnızca baş antrenör düzenleyebilir");
        return false;
      }
      setIsSaving(true);
      const { error } = await supabase
        .from("coach_contracts")
        .upsert(
          { coach_id: targetCoachId, content: html } as any,
          { onConflict: "coach_id" }
        );
      setIsSaving(false);
      if (error) {
        toast.error("Sözleşme kaydedilemedi: " + error.message);
        return false;
      }
      toast.success("Sözleşme şablonunuz kaydedildi");
      await fetchContract();
      return true;
    },
    [canEdit, targetCoachId, fetchContract]
  );

  return {
    contract,
    updatedAt,
    isLoading,
    isSaving,
    hasContract: isNonEmptyContract(contract),
    canEdit,
    saveContract,
    refetch: fetchContract,
  };
}

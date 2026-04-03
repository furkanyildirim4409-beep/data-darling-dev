import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SupplementLibraryItem {
  id: string;
  name: string;
  category: string;
  default_dosage: string | null;
  description: string | null;
  icon: string;
}

export interface SupplementTemplateItem {
  id: string;
  supplement_name: string;
  dosage: string | null;
  timing: string;
  icon: string;
  order_index: number;
}

export interface SupplementTemplate {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  itemCount: number;
}

export function useSupplementTemplates() {
  const { user, activeCoachId } = useAuth();
  const [loading, setLoading] = useState(false);

  const fetchSupplementLibrary = useCallback(async (search?: string) => {
    let query = supabase
      .from("supplements_library")
      .select("id, name, category, default_dosage, description, icon")
      .order("name");

    if (search?.trim()) {
      query = query.ilike("name", `%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Supplement library fetch error:", error);
      return [];
    }
    return (data ?? []) as SupplementLibraryItem[];
  }, []);

  const fetchSupplementTemplates = useCallback(async (): Promise<SupplementTemplate[]> => {
    if (!activeCoachId) return [];

    const { data: tpls, error } = await supabase
      .from("supplement_templates")
      .select("id, name, description, created_at")
      .eq("coach_id", activeCoachId)
      .eq("is_template", true)
      .order("created_at", { ascending: false });

    if (error || !tpls?.length) return [];

    const { data: items } = await supabase
      .from("supplement_template_items")
      .select("template_id")
      .in("template_id", tpls.map((t) => t.id));

    const countMap: Record<string, number> = {};
    (items || []).forEach((i) => {
      countMap[i.template_id] = (countMap[i.template_id] || 0) + 1;
    });

    return tpls.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      created_at: t.created_at,
      itemCount: countMap[t.id] || 0,
    }));
  }, [activeCoachId]);

  const fetchTemplateItems = useCallback(async (templateId: string): Promise<SupplementTemplateItem[]> => {
    const { data, error } = await supabase
      .from("supplement_template_items")
      .select("id, supplement_name, dosage, timing, icon, order_index")
      .eq("template_id", templateId)
      .order("order_index");

    if (error) {
      console.error("Fetch template items error:", error);
      return [];
    }
    return (data ?? []) as SupplementTemplateItem[];
  }, []);

  const saveSupplementTemplate = useCallback(async (
    name: string,
    description: string,
    items: { supplement_name: string; dosage: string; timing: string; icon: string }[],
    editingId?: string
  ): Promise<boolean> => {
    if (!user || !activeCoachId) {
      toast.error("Giriş yapmalısınız.");
      return false;
    }

    setLoading(true);
    let templateId: string;

    if (editingId) {
      const { error } = await supabase
        .from("supplement_templates")
        .update({ name, description: description || null })
        .eq("id", editingId);

      if (error) {
        toast.error("Şablon güncellenemedi: " + error.message);
        setLoading(false);
        return false;
      }
      templateId = editingId;
      await supabase.from("supplement_template_items").delete().eq("template_id", templateId);
    } else {
      const { data, error } = await supabase
        .from("supplement_templates")
        .insert({ coach_id: activeCoachId, name, description: description || null })
        .select("id")
        .single();

      if (error || !data) {
        toast.error("Şablon kaydedilemedi: " + (error?.message ?? ""));
        setLoading(false);
        return false;
      }
      templateId = data.id;
    }

    if (items.length > 0) {
      const rows = items.map((item, i) => ({
        template_id: templateId,
        supplement_name: item.supplement_name,
        dosage: item.dosage || null,
        timing: item.timing || "Sabah",
        icon: item.icon || "💊",
        order_index: i,
      }));

      const { error: itemErr } = await supabase.from("supplement_template_items").insert(rows);
      if (itemErr) {
        if (!editingId) {
          await supabase.from("supplement_templates").delete().eq("id", templateId);
        }
        toast.error("Takviye öğeleri kaydedilemedi: " + itemErr.message);
        setLoading(false);
        return false;
      }
    }

    toast.success(editingId ? `"${name}" güncellendi!` : `"${name}" kaydedildi!`);
    setLoading(false);
    return true;
  }, [user, activeCoachId]);

  const deleteSupplementTemplate = useCallback(async (id: string): Promise<boolean> => {
    await supabase.from("supplement_template_items").delete().eq("template_id", id);
    const { error } = await supabase.from("supplement_templates").delete().eq("id", id);
    if (error) {
      toast.error("Şablon silinemedi");
      return false;
    }
    toast.success("Şablon silindi");
    return true;
  }, []);

  const duplicateSupplementTemplate = useCallback(async (id: string): Promise<boolean> => {
    if (!activeCoachId) return false;

    const { data: tpl } = await supabase.from("supplement_templates").select("*").eq("id", id).single();
    if (!tpl) { toast.error("Şablon bulunamadı"); return false; }

    const { data: newTpl, error } = await supabase
      .from("supplement_templates")
      .insert({ name: `${tpl.name} (Kopya)`, description: tpl.description, coach_id: activeCoachId })
      .select("id")
      .single();

    if (error || !newTpl) { toast.error("Kopyalama başarısız"); return false; }

    const { data: items } = await supabase
      .from("supplement_template_items")
      .select("supplement_name, dosage, timing, icon, order_index")
      .eq("template_id", id);

    if (items && items.length > 0) {
      await supabase.from("supplement_template_items").insert(
        items.map((item) => ({ ...item, template_id: newTpl.id }))
      );
    }

    toast.success("Şablon kopyalandı");
    return true;
  }, [activeCoachId]);

  return {
    loading,
    fetchSupplementLibrary,
    fetchSupplementTemplates,
    fetchTemplateItems,
    saveSupplementTemplate,
    deleteSupplementTemplate,
    duplicateSupplementTemplate,
  };
}

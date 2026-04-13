import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CreateProductPayload {
  title: string;
  description?: string;
  price: number;
  image_url: string;
  is_active?: boolean;
}

interface UpdateProductStatusPayload {
  product_id: string;
  is_active: boolean;
}

export function useCoachProducts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["coach-products", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("coach_products")
        .select("*")
        .eq("coach_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateProduct() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateProductPayload) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("coach_products")
        .insert({
          coach_id: user.id,
          title: payload.title,
          description: payload.description ?? null,
          price: payload.price,
          image_url: payload.image_url,
          is_active: payload.is_active ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-products"] });
      toast.success("Ürün başarıyla eklendi.");
    },
    onError: (err: Error) => {
      toast.error(`Ürün eklenemedi: ${err.message}`);
    },
  });
}

export function useUpdateProductStatus() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateProductStatusPayload) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("coach_products")
        .update({ is_active: payload.is_active })
        .eq("id", payload.product_id)
        .eq("coach_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-products"] });
      toast.success("Ürün durumu güncellendi.");
    },
    onError: (err: Error) => {
      toast.error(`Durum güncellenemedi: ${err.message}`);
    },
  });
}

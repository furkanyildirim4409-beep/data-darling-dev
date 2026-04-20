import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "sonner";

interface CreateProductPayload {
  title: string;
  description?: string;
  price: number;
  category: string;
  imageFile: File;
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
  const { profile } = useProfile();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateProductPayload) => {
      if (!user) throw new Error("Not authenticated");

      // 1. Upload image to products bucket
      const ext = payload.imageFile.name.split(".").pop() || "jpg";
      const safeName = payload.imageFile.name
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(-40);
      const path = `${user.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(path, payload.imageFile, {
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) throw new Error(`Görsel yüklenemedi: ${uploadError.message}`);

      const { data: urlData } = supabase.storage.from("products").getPublicUrl(path);
      const imageUrl = urlData.publicUrl;

      // Helper to roll back the storage upload on later failures
      const rollback = async () => {
        await supabase.storage.from("products").remove([path]).catch(() => {});
      };

      // 2. Push to Shopify via shared edge function
      let shopifyProductId: string | null = null;
      let shopifyVariantId: string | null = null;
      try {
        const { data: shopifyData, error: shopifyError } = await supabase.functions.invoke(
          "create-shopify-product",
          {
            body: {
              title: payload.title,
              descriptionHtml: payload.description ?? "",
              price: payload.price,
              imageUrl,
              category: payload.category,
              vendorName: profile?.full_name ?? "Dynabolic Coach",
            },
          },
        );
        if (shopifyError) throw shopifyError;
        shopifyProductId = shopifyData?.productId ?? shopifyData?.product_id ?? null;
        shopifyVariantId = shopifyData?.variantId ?? shopifyData?.variant_id ?? null;
      } catch (err: any) {
        await rollback();
        throw new Error(`Shopify yayınlama hatası: ${err.message ?? err}`);
      }

      // 3. Persist mapping row
      const { data, error } = await supabase
        .from("coach_products")
        .insert({
          coach_id: user.id,
          title: payload.title,
          description: payload.description ?? null,
          price: payload.price,
          image_url: imageUrl,
          category: payload.category,
          shopify_product_id: shopifyProductId,
          shopify_variant_id: shopifyVariantId,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        await rollback();
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-products"] });
      toast.success("Ürün yayınlandı ve Shopify'a gönderildi.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Ürün eklenemedi.");
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

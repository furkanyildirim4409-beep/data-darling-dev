import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Star, Trash2, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface ReviewRow {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  image_url: string | null;
  created_at: string;
  is_approved: boolean;
}

interface EnrichedReview extends ReviewRow {
  product?: { title: string | null; image_url: string | null } | null;
  reviewer?: { full_name: string | null; avatar_url: string | null } | null;
}

function StarRow({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= n
              ? "w-3.5 h-3.5 fill-amber-400 text-amber-400"
              : "w-3.5 h-3.5 text-muted-foreground/40"
          }
        />
      ))}
    </div>
  );
}

export function ReviewModerationQueue() {
  const { activeCoachId } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["pending-product-reviews", activeCoachId],
    enabled: !!activeCoachId,
    queryFn: async (): Promise<EnrichedReview[]> => {
      const { data: reviews, error } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("is_approved", false)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (reviews || []) as ReviewRow[];
      if (!rows.length) return [];

      const productIds = [...new Set(rows.map((r) => r.product_id))];
      const userIds = [...new Set(rows.map((r) => r.user_id))];

      const [productsRes, profilesRes] = await Promise.all([
        supabase
          .from("coach_products")
          .select("shopify_product_id, title, image_url")
          .in("shopify_product_id", productIds),
        supabase.rpc("get_public_profiles", { _ids: userIds }),
      ]);

      const productMap = new Map<string, { title: string | null; image_url: string | null }>();
      for (const p of (productsRes.data || []) as any[]) {
        if (p.shopify_product_id) {
          productMap.set(p.shopify_product_id, { title: p.title, image_url: p.image_url });
        }
      }
      const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      for (const p of (profilesRes.data || []) as any[]) {
        profileMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url });
      }

      return rows.map((r) => ({
        ...r,
        product: productMap.get(r.product_id) ?? null,
        reviewer: profileMap.get(r.user_id) ?? null,
      }));
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_reviews")
        .update({ is_approved: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Yorum onaylandı");
      qc.invalidateQueries({ queryKey: ["pending-product-reviews"] });
    },
    onError: (e: any) => toast.error(e.message || "Onaylanamadı"),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Yorum reddedildi");
      qc.invalidateQueries({ queryKey: ["pending-product-reviews"] });
    },
    onError: (e: any) => toast.error(e.message || "Silinemedi"),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const reviews = data ?? [];

  if (!reviews.length) {
    return (
      <div className="glass rounded-xl border border-border p-10 text-center">
        <MessageSquareText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Onay bekleyen yorum yok.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Bekleyen Yorumlar
        </h3>
        <Badge variant="secondary">{reviews.length}</Badge>
      </div>

      {reviews.map((r) => {
        const reviewerName = r.reviewer?.full_name || "Sporcu";
        const initials = reviewerName
          .split(" ")
          .map((s) => s[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        return (
          <div
            key={r.id}
            className="glass rounded-xl border border-border p-4 flex flex-col gap-3"
          >
            <div className="flex items-start gap-3">
              {r.product?.image_url ? (
                <img
                  src={r.product.image_url}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {r.product?.title || "Ürün"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(r.created_at), {
                    addSuffix: true,
                    locale: tr,
                  })}
                </p>
              </div>
              <StarRow n={r.rating} />
            </div>

            <div className="flex items-start gap-3 pl-1">
              <Avatar className="w-7 h-7">
                <AvatarImage src={r.reviewer?.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground">{reviewerName}</p>
                {r.comment ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-0.5">
                    {r.comment}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic mt-0.5">
                    Yorum yazılmamış.
                  </p>
                )}
                {r.image_url && (
                  <img
                    src={r.image_url}
                    alt=""
                    className="mt-2 rounded-lg max-h-40 object-cover"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => reject.mutate(r.id)}
                disabled={reject.isPending}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Reddet
              </Button>
              <Button
                size="sm"
                onClick={() => approve.mutate(r.id)}
                disabled={approve.isPending}
              >
                <Check className="w-3.5 h-3.5 mr-1.5" />
                Onayla
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

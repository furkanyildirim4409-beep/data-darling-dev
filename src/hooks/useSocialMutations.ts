import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useCoachPosts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["social-posts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("social_posts")
        .select("*")
        .eq("coach_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

interface CreatePostPayload {
  content?: string;
  type: "text" | "transformation" | "video";
  before_image_url?: string;
  after_image_url?: string;
  video_url?: string;
  video_thumbnail_url?: string;
}

interface CreateStoryPayload {
  media_url: string;
  duration_hours: number;
  category?: string;
}

export function useCreatePost() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePostPayload) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("social_posts")
        .insert({
          coach_id: user.id,
          content: payload.content ?? "",
          type: payload.type,
          before_image_url: payload.before_image_url ?? null,
          after_image_url: payload.after_image_url ?? null,
          video_url: payload.video_url ?? null,
          video_thumbnail_url: payload.video_thumbnail_url ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-posts"] });
      toast.success("Gönderi başarıyla oluşturuldu.");
    },
    onError: (err: Error) => {
      toast.error(`Gönderi oluşturulamadı: ${err.message}`);
    },
  });
}

export function useCreateStory() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateStoryPayload) => {
      if (!user) throw new Error("Not authenticated");
      const expires_at = new Date(
        Date.now() + payload.duration_hours * 3600000
      ).toISOString();

      const { data, error } = await supabase
        .from("coach_stories")
        .insert({
          coach_id: user.id,
          media_url: payload.media_url,
          expires_at,
          category: payload.category ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-stories"] });
      toast.success("Hikaye başarıyla yayınlandı.");
    },
    onError: (err: Error) => {
      toast.error(`Hikaye oluşturulamadı: ${err.message}`);
    },
  });
}

// ── Post mutations ──

interface UpdatePostPayload {
  id: string;
  content?: string;
  before_image_url?: string;
  after_image_url?: string;
  video_url?: string;
  video_thumbnail_url?: string;
}

export function useUpdatePost() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdatePostPayload) => {
      if (!user) throw new Error("Not authenticated");
      const { id, ...fields } = payload;
      const { data, error } = await supabase
        .from("social_posts")
        .update(fields)
        .eq("id", id)
        .eq("coach_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-posts"] });
      toast.success("Gönderi güncellendi.");
    },
    onError: (err: Error) => {
      toast.error(`Gönderi güncellenemedi: ${err.message}`);
    },
  });
}

export function useDeletePost() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("social_posts")
        .delete()
        .eq("id", postId)
        .eq("coach_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-posts"] });
      toast.success("Gönderi silindi.");
    },
    onError: (err: Error) => {
      toast.error(`Gönderi silinemedi: ${err.message}`);
    },
  });
}

// ── Story mutations ──

export function useDeleteStory() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("coach_stories")
        .delete()
        .eq("id", storyId)
        .eq("coach_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-stories"] });
      toast.success("Hikaye silindi.");
    },
    onError: (err: Error) => {
      toast.error(`Hikaye silinemedi: ${err.message}`);
    },
  });
}

interface UpdateStoryPayload {
  id: string;
  category?: string;
}

export function useUpdateStoryCategory() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ storyId, category }: { storyId: string; category: string | null }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("coach_stories")
        .update({ category })
        .eq("id", storyId)
        .eq("coach_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-stories-archive"] });
      qc.invalidateQueries({ queryKey: ["coach-stories"] });
    },
    onError: (err: Error) => {
      toast.error(`Kategori güncellenemedi: ${err.message}`);
    },
  });
}

export function useCoachStoryArchive() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["coach-stories-archive", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("coach_stories")
        .select("*")
        .eq("coach_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useUpdateStory() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateStoryPayload) => {
      if (!user) throw new Error("Not authenticated");
      const { id, ...fields } = payload;
      const { data, error } = await supabase
        .from("coach_stories")
        .update(fields)
        .eq("id", id)
        .eq("coach_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-stories"] });
      toast.success("Hikaye güncellendi.");
    },
    onError: (err: Error) => {
      toast.error(`Hikaye güncellenemedi: ${err.message}`);
    },
  });
}

// ── Story analytics ──

export function useStoryAnalytics(storyId: string | undefined) {
  return useQuery({
    queryKey: ["story-analytics", storyId],
    enabled: !!storyId,
    queryFn: async () => {
      if (!storyId) return [];
      // 1) fetch views
      const { data: views, error } = await (supabase as any)
        .from("story_views")
        .select("id, viewed_at, viewer_id")
        .eq("story_id", storyId)
        .order("viewed_at", { ascending: false });
      if (error) throw error;
      if (!views || views.length === 0) return [];

      // 2) batch-fetch viewer profiles
      const viewerIds = [...new Set(views.map((v: any) => v.viewer_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", viewerIds as string[]);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, p])
      );

      return views.map((v: any) => ({
        id: v.id,
        viewedAt: v.viewed_at,
        viewerId: v.viewer_id,
        fullName: profileMap.get(v.viewer_id)?.full_name ?? "Bilinmeyen",
        avatarUrl: profileMap.get(v.viewer_id)?.avatar_url ?? null,
      }));
    },
  });
}

// ── Viewer status check ──

export function useCheckViewerStatus() {
  return useMutation({
    mutationFn: async (viewerId: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, coach_id, full_name, avatar_url, email")
        .eq("id", viewerId)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

// ── Send coaching invite ──

export function useSendCoachingInvite() {
  return useMutation({
    mutationFn: async (payload: { coachName: string; leadName: string; leadEmail: string }) => {
      const { data, error } = await supabase.functions.invoke('send-coaching-invite', {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Koçluk daveti e-posta ile gönderildi!");
    },
    onError: (err: Error) => {
      toast.error(`Davet gönderilemedi: ${err.message}`);
    },
  });
}

// ── Follower count ──

export function useMyFollowerCount() {
  const { user } = useAuth();

  return useQuery<number>({
    queryKey: ["my-follower-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("user_follows")
        .select("id", { count: "exact", head: true })
        .eq("followed_id", user.id);
      if (error) throw error;
      return count || 0;
    },
  });
}

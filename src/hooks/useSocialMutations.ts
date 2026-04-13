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

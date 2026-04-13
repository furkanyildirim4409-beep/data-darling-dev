import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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

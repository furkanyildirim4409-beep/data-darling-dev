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

      // Highlight state is fully decoupled from expires_at.
      // The 24h active ring is governed exclusively by the original expires_at.
      const updates = category
        ? { category, is_highlighted: true }
        : { category: null, is_highlighted: false };

      const { data, error } = await supabase
        .from("coach_stories")
        .update(updates)
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
      qc.invalidateQueries({ queryKey: ["coach-highlights"] });
    },
    onError: (err: Error) => {
      toast.error(`Kategori güncellenemedi: ${err.message}`);
    },
  });
}

export interface HighlightGroup {
  category: string;
  stories: any[];
  count: number;
  customCoverUrl: string | null;
  orderIndex: number;
  isPinnedToKokpit: boolean;
  showOnProfile: boolean;
}

export function useCoachHighlights() {
  const { user } = useAuth();

  return useQuery<HighlightGroup[]>({
    queryKey: ["coach-highlights", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const [storiesRes, metaRes] = await Promise.all([
        supabase
          .from("coach_stories")
          .select("*")
          .eq("coach_id", user.id)
          .eq("is_highlighted", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("coach_highlight_metadata")
          .select("category_name, custom_cover_url, order_index, is_pinned_to_kokpit, show_on_profile")
          .eq("coach_id", user.id),
      ]);
      if (storiesRes.error) throw storiesRes.error;
      if (metaRes.error) throw metaRes.error;

      const metaMap = new Map<string, { cover: string | null; order: number; isPinned: boolean; showOnProfile: boolean }>(
        (metaRes.data ?? []).map((m: any) => [
          m.category_name,
          {
            cover: m.custom_cover_url,
            order: m.order_index ?? 0,
            isPinned: m.is_pinned_to_kokpit ?? true,
            showOnProfile: m.show_on_profile ?? true,
          },
        ]),
      );

      const groups = new Map<string, any[]>();
      for (const s of storiesRes.data ?? []) {
        const key = (s.category && s.category.trim()) || "Öne Çıkanlar";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(s);
      }

      // Include metadata-only (empty) highlight groups too — coaches create groups before adding stories.
      for (const name of metaMap.keys()) {
        if (!groups.has(name)) groups.set(name, []);
      }

      const result: HighlightGroup[] = Array.from(groups.entries()).map(([category, stories]) => ({
        category,
        stories,
        count: stories.length,
        customCoverUrl: metaMap.get(category)?.cover ?? null,
        orderIndex: metaMap.get(category)?.order ?? Number.MAX_SAFE_INTEGER,
        isPinnedToKokpit: metaMap.get(category)?.isPinned ?? true,
        showOnProfile: metaMap.get(category)?.showOnProfile ?? true,
      }));

      // Ordered by metadata order_index; metadata-less groups fall to the end alphabetically.
      result.sort((a, b) => {
        if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
        return a.category.localeCompare(b.category, "tr");
      });
      return result;
    },
  });
}

export function useUpsertHighlightMetadata() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryName, customCoverUrl }: { categoryName: string; customCoverUrl: string | null }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("coach_highlight_metadata")
        .upsert(
          { coach_id: user.id, category_name: categoryName, custom_cover_url: customCoverUrl },
          { onConflict: "coach_id,category_name" },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-highlights"] });
      toast.success("Kapak fotoğrafı güncellendi.");
    },
    onError: (err: Error) => {
      toast.error(`Kapak güncellenemedi: ${err.message}`);
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
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: { coachName: string; leadName: string; leadEmail: string }) => {
      if (!profile?.username) {
        toast.error("Lütfen davet göndermeden önce Ayarlar sayfasından kullanıcı adınızı (Kurumsal E-posta) belirleyin.");
        throw new Error("Username not set");
      }
      const { data, error } = await supabase.functions.invoke('send-coaching-invite', {
        body: { ...payload, coachUsername: profile.username },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Koçluk daveti e-posta ile gönderildi!");
    },
    onError: (err: Error) => {
      if (err.message !== "Username not set") {
        toast.error(`Davet gönderilemedi: ${err.message}`);
      }
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

// ── Highlights Manager (Part 8) ──

async function uploadToSocialMedia(file: File, userId: string, prefix = "") {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from("social-media").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("social-media").getPublicUrl(path);
  return data.publicUrl;
}

export function useCreateHighlightGroup() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, coverFile }: { name: string; coverFile: File }) => {
      if (!user) throw new Error("Not authenticated");
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Grup adı boş olamaz");

      // Compute next order_index per coach
      const { data: existing } = await supabase
        .from("coach_highlight_metadata")
        .select("order_index")
        .eq("coach_id", user.id)
        .order("order_index", { ascending: false })
        .limit(1);
      const nextOrder = (existing?.[0]?.order_index ?? -1) + 1;

      const coverUrl = await uploadToSocialMedia(coverFile, user.id, "highlight-covers/");

      const { data, error } = await supabase
        .from("coach_highlight_metadata")
        .upsert(
          {
            coach_id: user.id,
            category_name: trimmed,
            custom_cover_url: coverUrl,
            order_index: nextOrder,
          },
          { onConflict: "coach_id,category_name" },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-highlights"] });
      toast.success("Yeni öne çıkan grup oluşturuldu.");
    },
    onError: (err: Error) => {
      toast.error(`Grup oluşturulamadı: ${err.message}`);
    },
  });
}

export function useDeleteHighlightGroup() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (categoryName: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error: storiesErr } = await supabase
        .from("coach_stories")
        .update({ is_highlighted: false, category: null })
        .eq("coach_id", user.id)
        .eq("category", categoryName);
      if (storiesErr) throw storiesErr;

      const { error: metaErr } = await supabase
        .from("coach_highlight_metadata")
        .delete()
        .eq("coach_id", user.id)
        .eq("category_name", categoryName);
      if (metaErr) throw metaErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-highlights"] });
      qc.invalidateQueries({ queryKey: ["coach-stories"] });
      qc.invalidateQueries({ queryKey: ["coach-stories-archive"] });
      toast.success("Grup silindi.");
    },
    onError: (err: Error) => {
      toast.error(`Grup silinemedi: ${err.message}`);
    },
  });
}

export function useAddStoriesToHighlight() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ category, files }: { category: string; files: File[] }) => {
      if (!user) throw new Error("Not authenticated");
      if (!files.length) return [];

      const farFuture = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
      const inserts: any[] = [];

      for (const file of files) {
        const url = await uploadToSocialMedia(file, user.id);
        inserts.push({
          coach_id: user.id,
          media_url: url,
          category,
          is_highlighted: true,
          expires_at: farFuture,
        });
      }

      const { data, error } = await supabase
        .from("coach_stories")
        .insert(inserts)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["coach-highlights"] });
      qc.invalidateQueries({ queryKey: ["coach-stories"] });
      qc.invalidateQueries({ queryKey: ["coach-stories-archive"] });
      const n = Array.isArray(data) ? data.length : 0;
      if (n > 0) toast.success(`${n} hikaye eklendi.`);
    },
    onError: (err: Error) => {
      toast.error(`Hikaye eklenemedi: ${err.message}`);
    },
  });
}

export function useDeleteStoryFromHighlight() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("coach_stories")
        .update({ is_highlighted: false })
        .eq("id", storyId)
        .eq("coach_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-highlights"] });
      qc.invalidateQueries({ queryKey: ["coach-stories-archive"] });
    },
    onError: (err: Error) => {
      toast.error(`Hikaye kaldırılamadı: ${err.message}`);
    },
  });
}

export function useReorderHighlights() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (orderedNames: string[]) => {
      if (!user) throw new Error("Not authenticated");
      const rows = orderedNames.map((name, idx) => ({
        coach_id: user.id,
        category_name: name,
        order_index: idx,
      }));
      const { error } = await supabase
        .from("coach_highlight_metadata")
        .upsert(rows, { onConflict: "coach_id,category_name" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-highlights"] });
    },
    onError: (err: Error) => {
      toast.error(`Sıralama güncellenemedi: ${err.message}`);
    },
  });
}

export function useToggleKokpitPin() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryName, isPinned }: { categoryName: string; isPinned: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("coach_highlight_metadata")
        .upsert(
          {
            coach_id: user.id,
            category_name: categoryName,
            is_pinned_to_kokpit: isPinned,
          },
          { onConflict: "coach_id,category_name" },
        );
      if (error) throw error;
      return { categoryName, isPinned };
    },
    onMutate: async ({ categoryName, isPinned }) => {
      await qc.cancelQueries({ queryKey: ["coach-highlights"] });
      const prev = qc.getQueryData<HighlightGroup[]>(["coach-highlights", user?.id]);
      if (prev) {
        qc.setQueryData<HighlightGroup[]>(
          ["coach-highlights", user?.id],
          prev.map((g) =>
            g.category === categoryName ? { ...g, isPinnedToKokpit: isPinned } : g,
          ),
        );
      }
      return { prev };
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["coach-highlights", user?.id], ctx.prev);
      toast.error(`Güncellenemedi: ${err.message}`);
    },
    onSuccess: ({ isPinned }) => {
      toast.success(isPinned ? "Kokpit'te gösteriliyor." : "Kokpit'ten gizlendi.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["coach-highlights"] });
      qc.invalidateQueries({ queryKey: ["athlete-coach-highlights"] });
    },
  });
}

export function useToggleProfileVisibility() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryName, showOnProfile }: { categoryName: string; showOnProfile: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("coach_highlight_metadata")
        .upsert(
          {
            coach_id: user.id,
            category_name: categoryName,
            show_on_profile: showOnProfile,
          },
          { onConflict: "coach_id,category_name" },
        );
      if (error) throw error;
      return { categoryName, showOnProfile };
    },
    onMutate: async ({ categoryName, showOnProfile }) => {
      await qc.cancelQueries({ queryKey: ["coach-highlights"] });
      const prev = qc.getQueryData<HighlightGroup[]>(["coach-highlights", user?.id]);
      if (prev) {
        qc.setQueryData<HighlightGroup[]>(
          ["coach-highlights", user?.id],
          prev.map((g) =>
            g.category === categoryName ? { ...g, showOnProfile } : g,
          ),
        );
      }
      return { prev };
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["coach-highlights", user?.id], ctx.prev);
      toast.error(`Güncellenemedi: ${err.message}`);
    },
    onSuccess: ({ showOnProfile }) => {
      toast.success(showOnProfile ? "Profilde gösteriliyor." : "Profilden gizlendi.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["coach-highlights"] });
      qc.invalidateQueries({ queryKey: ["coach-profile-highlights"] });
    },
  });
}

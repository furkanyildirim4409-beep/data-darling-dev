import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Radio, X, Eye, ChevronDown, UserPlus, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useCoachStoryArchive, useStoryAnalytics, useCheckViewerStatus, useSendCoachingInvite, useUpdateStoryCategory, useDeleteStory } from "@/hooks/useSocialMutations";
import { useAuth } from "@/contexts/AuthContext";
import { CategoryCombobox } from "./CategoryCombobox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ActiveStoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function timeRemaining(expiresAt: string) {
  return formatDistanceToNow(new Date(expiresAt), { locale: tr, addSuffix: false });
}

interface ViewersPanelProps {
  storyId: string;
  onViewerClick: (viewer: { viewerId: string; fullName: string; avatarUrl: string | null }) => void;
}

function ViewersPanel({ storyId, onViewerClick }: ViewersPanelProps) {
  const { data: viewers, isLoading } = useStoryAnalytics(storyId);

  if (isLoading) {
    return (
      <div className="space-y-3 p-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (!viewers?.length) {
    return (
      <div className="p-6 text-center text-white/50 text-sm">
        Henüz görüntüleme yok
      </div>
    );
  }

  return (
    <div className="max-h-48 overflow-y-auto space-y-1 p-3">
      {viewers.map((v) => (
        <button
          key={v.id}
          onClick={() => onViewerClick({ viewerId: v.viewerId, fullName: v.fullName, avatarUrl: v.avatarUrl })}
          className="flex items-center gap-3 w-full px-2 py-1.5 rounded-md cursor-pointer hover:bg-white/10 transition-colors text-left"
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src={v.avatarUrl ?? undefined} />
            <AvatarFallback className="text-xs bg-white/10 text-white">
              {v.fullName?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{v.fullName}</p>
          </div>
          <span className="text-[11px] text-white/40 shrink-0">
            {formatDistanceToNow(new Date(v.viewedAt), { locale: tr, addSuffix: true })}
          </span>
        </button>
      ))}
    </div>
  );
}

export function ActiveStoriesDialog({ open, onOpenChange }: ActiveStoriesDialogProps) {
  const { user, isSubCoach } = useAuth();
  const navigate = useNavigate();
  const { data: allStories, isLoading } = useCoachStoryArchive();
  const [viewingStory, setViewingStory] = useState<any | null>(null);
  const [showViewers, setShowViewers] = useState(false);
  const { data: viewers } = useStoryAnalytics(viewingStory?.id);
  const checkStatus = useCheckViewerStatus();
  const sendInvite = useSendCoachingInvite();
  const { mutateAsync: updateCategory, isPending: catPending } = useUpdateStoryCategory();
  const [selectedLead, setSelectedLead] = useState<{ id: string; fullName: string; avatarUrl: string | null; email: string | null } | null>(null);

  const handleCategoryChange = async (category: string | null) => {
    if (!viewingStory) return;
    try {
      await updateCategory({ storyId: viewingStory.id, category });
      setViewingStory({ ...viewingStory, category, is_highlighted: !!category });
      toast.success(category ? "Hikaye öne çıkanlara eklendi!" : "Kategori kaldırıldı");
    } catch {}
  };

  const activeStories = (allStories ?? []).filter(
    (s) => new Date(s.expires_at) > new Date()
  );

  const handleViewerClick = async (viewer: { viewerId: string; fullName: string; avatarUrl: string | null }) => {
    try {
      const profile = await checkStatus.mutateAsync(viewer.viewerId);
      if (profile.coach_id === user?.id) {
        setViewingStory(null);
        onOpenChange(false);
        navigate(`/athletes/${viewer.viewerId}`);
      } else if (profile.coach_id) {
        toast.error("Bu kişi başka bir koça bağlı.");
      } else if (isSubCoach) {
        toast.info("Bu işlemi yalnızca ana koç yapabilir.");
      } else {
        setSelectedLead({ id: viewer.viewerId, fullName: viewer.fullName, avatarUrl: viewer.avatarUrl, email: profile.email ?? null });
      }
    } catch {
      toast.error("Kullanıcı bilgisi alınamadı.");
    }
  };

  const handleSendInvite = () => {
    if (!selectedLead) return;
    if (!selectedLead.email) {
      toast.error("Bu kullanıcının e-posta adresi bulunamadı.");
      return;
    }
    const coachName = user?.user_metadata?.full_name || "Koçunuz";
    sendInvite.mutate(
      { coachName, leadName: selectedLead.fullName, leadEmail: selectedLead.email },
      { onSuccess: () => setSelectedLead(null) },
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-primary" />
              Aktif Hikayeler
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[9/16] rounded-lg" />
              ))}
            </div>
          ) : !activeStories.length ? (
            <div className="text-center py-12 text-muted-foreground">
              Şu anda aktif hikaye yok
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {activeStories.map((story) => (
                <button
                  key={story.id}
                  onClick={() => {
                    setViewingStory(story);
                    setShowViewers(false);
                  }}
                  className="relative group rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all aspect-[9/16]"
                >
                  <img
                    src={story.media_url}
                    alt="Story"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-1.5 left-1.5 right-1.5">
                    <span className="text-[10px] text-white/70">
                      {timeRemaining(story.expires_at)} kaldı
                    </span>
                  </div>
                  <div className="absolute top-1.5 right-1.5">
                    <Badge className="text-[9px] px-1.5 py-0 bg-success text-success-foreground">
                      Aktif
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full-screen viewer with analytics */}
      <Dialog open={!!viewingStory} onOpenChange={() => setViewingStory(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-black border-none">
          <button
            onClick={() => setViewingStory(null)}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          {viewingStory && (
            <>
              {viewingStory.media_url.match(/\.(mp4|webm|mov)$/i) ? (
                <video src={viewingStory.media_url} controls autoPlay className="w-full max-h-[60vh] object-contain" />
              ) : (
                <img src={viewingStory.media_url} alt="Story" className="w-full max-h-[60vh] object-contain" />
              )}

              {/* Highlight category bar */}
              <div className="px-4 py-3 border-t border-white/10 bg-black/40">
                <label className="text-xs text-white/60 mb-1.5 block">Öne Çıkan Kategorisi</label>
                <CategoryCombobox
                  value={viewingStory.category ?? null}
                  onChange={handleCategoryChange}
                  disabled={catPending}
                  variant="dark"
                />
              </div>

              {/* Analytics bar */}
              <div className="border-t border-white/10">
                <Button
                  variant="ghost"
                  onClick={() => setShowViewers(!showViewers)}
                  className="w-full justify-between px-4 py-3 h-auto text-white hover:bg-white/5 rounded-none"
                >
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-white/60" />
                    <span className="text-sm font-medium">
                      {viewers?.length ?? 0} Görüntülenme
                    </span>
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 text-white/40 transition-transform",
                    showViewers && "rotate-180"
                  )} />
                </Button>

                {showViewers && (
                  <div className="border-t border-white/10 animate-fade-in">
                    <ViewersPanel storyId={viewingStory.id} onViewerClick={handleViewerClick} />
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Invitation Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Koçluk Daveti
            </DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="flex flex-col items-center gap-4 py-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={selectedLead.avatarUrl ?? undefined} />
                <AvatarFallback className="text-lg bg-muted text-muted-foreground">
                  {selectedLead.fullName?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-base font-medium text-foreground">{selectedLead.fullName}</p>
              <p className="text-sm text-muted-foreground text-center">
                Bu kullanıcı henüz bir koça bağlı değil. Koçluk daveti göndermek ister misiniz?
              </p>
              <Button onClick={handleSendInvite} className="w-full" disabled={sendInvite.isPending}>
                <UserPlus className="w-4 h-4 mr-2" />
                {sendInvite.isPending ? "Gönderiliyor..." : "Koçluk Daveti Gönder"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

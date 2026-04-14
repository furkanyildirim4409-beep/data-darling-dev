import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Radio, X, Eye, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useCoachStoryArchive, useStoryAnalytics } from "@/hooks/useSocialMutations";
import { cn } from "@/lib/utils";

interface ActiveStoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function timeRemaining(expiresAt: string) {
  return formatDistanceToNow(new Date(expiresAt), { locale: tr, addSuffix: false });
}

function ViewersPanel({ storyId }: { storyId: string }) {
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
    <div className="max-h-48 overflow-y-auto space-y-2 p-3">
      {viewers.map((v) => (
        <div key={v.id} className="flex items-center gap-3">
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
        </div>
      ))}
    </div>
  );
}

export function ActiveStoriesDialog({ open, onOpenChange }: ActiveStoriesDialogProps) {
  const { data: allStories, isLoading } = useCoachStoryArchive();
  const [viewingStory, setViewingStory] = useState<any | null>(null);
  const [showViewers, setShowViewers] = useState(false);
  const { data: viewers } = useStoryAnalytics(viewingStory?.id);

  const activeStories = (allStories ?? []).filter(
    (s) => new Date(s.expires_at) > new Date()
  );

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
                    <ViewersPanel storyId={viewingStory.id} />
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

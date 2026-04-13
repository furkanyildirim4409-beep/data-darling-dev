import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Archive, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCoachStoryArchive } from "@/hooks/useSocialMutations";

interface StoryArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StoryArchiveDialog({ open, onOpenChange }: StoryArchiveDialogProps) {
  const { data: stories, isLoading } = useCoachStoryArchive();
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);

  const isActive = (expiresAt: string) => new Date(expiresAt) > new Date();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-primary" />
              Hikaye Arşivi
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[9/16] rounded-lg" />
              ))}
            </div>
          ) : !stories?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              Henüz hikaye yok
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {stories.map((story) => (
                <button
                  key={story.id}
                  onClick={() => setViewingUrl(story.media_url)}
                  className="relative group rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all aspect-[9/16]"
                >
                  <img
                    src={story.media_url}
                    alt="Story"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-col gap-1">
                    {story.category && (
                      <span className="text-[10px] text-white/80 truncate">
                        {story.category}
                      </span>
                    )}
                    <span className="text-[10px] text-white/70">
                      {format(new Date(story.created_at), "d MMM yyyy", { locale: tr })}
                    </span>
                  </div>
                  <div className="absolute top-1.5 right-1.5">
                    <Badge
                      variant={isActive(story.expires_at) ? "default" : "secondary"}
                      className="text-[9px] px-1.5 py-0"
                    >
                      {isActive(story.expires_at) ? "Aktif" : "Arşiv"}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full-screen viewer */}
      <Dialog open={!!viewingUrl} onOpenChange={() => setViewingUrl(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-black border-none">
          <button
            onClick={() => setViewingUrl(null)}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          {viewingUrl && (
            viewingUrl.match(/\.(mp4|webm|mov)$/i) ? (
              <video src={viewingUrl} controls autoPlay className="w-full max-h-[80vh] object-contain" />
            ) : (
              <img src={viewingUrl} alt="Story" className="w-full max-h-[80vh] object-contain" />
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

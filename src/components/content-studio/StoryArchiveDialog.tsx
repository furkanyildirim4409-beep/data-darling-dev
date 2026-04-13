import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Archive, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCoachStoryArchive, useUpdateStoryCategory } from "@/hooks/useSocialMutations";
import { highlightCategories } from "@/data/storyCategories";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StoryArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StoryArchiveDialog({ open, onOpenChange }: StoryArchiveDialogProps) {
  const { data: stories, isLoading } = useCoachStoryArchive();
  const [viewingStory, setViewingStory] = useState<any | null>(null);
  const { mutateAsync: updateCategory, isPending } = useUpdateStoryCategory();

  const isActive = (expiresAt: string) => new Date(expiresAt) > new Date();

  const currentCategoryId = (() => {
    if (!viewingStory?.category) return "remove";
    const found = highlightCategories.find(c => c.name === viewingStory.category);
    return found?.id ?? "remove";
  })();

  const handleCategoryChange = async (value: string) => {
    if (!viewingStory) return;
    const category = value === "remove" ? null : highlightCategories.find(c => c.id === value)?.name ?? null;
    try {
      await updateCategory({ storyId: viewingStory.id, category });
      setViewingStory({ ...viewingStory, category });
      toast.success(category ? "Hikaye öne çıkanlara eklendi!" : "Kategori kaldırıldı");
    } catch {}
  };

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
                  onClick={() => setViewingStory(story)}
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
                <video src={viewingStory.media_url} controls autoPlay className="w-full max-h-[70vh] object-contain" />
              ) : (
                <img src={viewingStory.media_url} alt="Story" className="w-full max-h-[70vh] object-contain" />
              )}
              {/* Category assignment bar */}
              <div className="p-3 bg-black/80 border-t border-white/10">
                <label className="text-xs text-white/60 mb-1.5 block">Öne Çıkan Kategorisi</label>
                <Select value={currentCategoryId} onValueChange={handleCategoryChange} disabled={isPending}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white text-sm">
                    <SelectValue placeholder="Kategori seç" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="remove">
                      <span className="text-muted-foreground">Kategoriden Çıkar</span>
                    </SelectItem>
                    {highlightCategories.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <Icon className={cn("w-4 h-4", cat.color)} />
                            <span>{cat.name}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Play, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
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
import { cn } from "@/lib/utils";
import {
  useAddStoriesToHighlight,
  useDeleteHighlightGroup,
  useDeleteStoryFromHighlight,
  useToggleKokpitPin,
  useToggleProfileVisibility,
  useUpsertHighlightMetadata,
  type HighlightGroup,
} from "@/hooks/useSocialMutations";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { HighlightCoverCropper } from "./HighlightCoverCropper";

interface Props {
  group: HighlightGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const isVideo = (url: string) => /\.(mp4|webm|mov)$/i.test(url);

export function HighlightDetailSheet({ group, open, onOpenChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showCropper, setShowCropper] = useState(false);

  const addStories = useAddStoriesToHighlight();
  const deleteStory = useDeleteStoryFromHighlight();
  const deleteGroup = useDeleteHighlightGroup();
  const upsertMeta = useUpsertHighlightMetadata();
  const togglePin = useToggleKokpitPin();
  const toggleProfile = useToggleProfileVisibility();

  if (!group) return null;

  const cover =
    group.customCoverUrl ?? group.stories[0]?.media_url ?? null;
  const coverIsVideo = cover ? isVideo(cover) : false;

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
    );
    if (arr.length === 0) {
      toast.error("Lütfen geçerli görsel veya video dosyaları seçin.");
      return;
    }
    await addStories.mutateAsync({ category: group.category, files: arr });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg bg-card border-border p-0 flex flex-col"
        >
          <SheetHeader className="p-5 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-primary/40 ring-offset-2 ring-offset-card shrink-0 bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center">
                {cover && !coverIsVideo ? (
                  <img src={cover} alt={group.category} className="w-full h-full object-cover" />
                ) : cover && coverIsVideo ? (
                  <video src={cover} className="w-full h-full object-cover" muted playsInline />
                ) : (
                  <ImagePlus className="w-6 h-6 text-primary-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <SheetTitle className="truncate">{group.category}</SheetTitle>
                <SheetDescription>
                  {group.count} hikaye {group.count === 0 && "— ilk hikayeni ekle"}
                </SheetDescription>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                className="border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => setShowCropper(true)}
              >
                <ImagePlus className="w-3.5 h-3.5 mr-1.5" />
                Kapak Değiştir
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/10 ml-auto"
                onClick={() => setConfirmDelete(true)}
                disabled={deleteGroup.isPending}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Grubu Sil
              </Button>
            </div>

            <div className="mt-2 flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <div className="min-w-0">
                <Label htmlFor="profile-visibility" className="text-sm font-medium cursor-pointer">
                  Profilde Göster
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Kapalıyken bu grup koç profilinde gizlenir.
                </p>
              </div>
              <Switch
                id="profile-visibility"
                checked={group.showOnProfile}
                disabled={toggleProfile.isPending}
                onCheckedChange={(checked) =>
                  toggleProfile.mutate({ categoryName: group.category, showOnProfile: checked })
                }
              />
            </div>


            <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <div className="min-w-0">
                <Label htmlFor="kokpit-pin" className="text-sm font-medium cursor-pointer">
                  Öğrenci Kokpitinde Göster
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Kapalıyken bu grup yalnızca profilinde görünür.
                </p>
              </div>
              <Switch
                id="kokpit-pin"
                checked={group.isPinnedToKokpit}
                disabled={togglePin.isPending}
                onCheckedChange={(checked) =>
                  togglePin.mutate({ categoryName: group.category, isPinned: checked })
                }
              />
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto scrollbar-hide p-5 space-y-5">
            {/* Dropzone */}
            <div
              className={cn(
                "relative border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer",
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-muted/30",
                addStories.isPending && "pointer-events-none opacity-70",
              )}
              onClick={() => fileInputRef.current?.click()}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  {addStories.isPending ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-primary" />
                  )}
                </div>
                <p className="text-sm font-medium text-foreground">
                  {addStories.isPending ? "Yükleniyor..." : "Hikaye yükle"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Görsel veya video sürükle, ya da tıkla
                </p>
              </div>
            </div>

            {/* Story Grid */}
            {group.stories.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  Bu gruba henüz hikaye eklenmedi — yukarıdan yükleyin.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {group.stories.map((s: any) => {
                  const v = isVideo(s.media_url);
                  return (
                    <div
                      key={s.id}
                      className="relative aspect-[3/4] rounded-lg overflow-hidden border border-border bg-muted group"
                    >
                      {v ? (
                        <video
                          src={s.media_url}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          src={s.media_url}
                          alt="Story"
                          className="w-full h-full object-cover"
                        />
                      )}

                      {v && (
                        <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                          <Play className="w-3 h-3 text-white" fill="white" />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => deleteStory.mutate(s.id)}
                        disabled={deleteStory.isPending}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                        aria-label="Hikayeyi kaldır"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm group delete */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Grubu silmek istiyor musun?</AlertDialogTitle>
            <AlertDialogDescription>
              "{group.category}" grubu silinecek. İçindeki hikayeler arşivde kalacak ama Öne
              Çıkanlar'dan kaldırılacak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                await deleteGroup.mutateAsync(group.category);
                setConfirmDelete(false);
                onOpenChange(false);
              }}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cover replace */}
      {showCropper && (
        <HighlightCoverCropper
          open={showCropper}
          onOpenChange={(o) => setShowCropper(o)}
          categoryName={group.category}
          onSaved={(url) => {
            upsertMeta.mutate({ categoryName: group.category, customCoverUrl: url });
            setShowCropper(false);
          }}
        />
      )}
    </>
  );
}

import { useState } from "react";
import { Plus, Edit2, Star, Wand2, Upload, Archive, Radio, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StoryTemplateBuilder } from "./StoryTemplateBuilder";
import { StoryUploadModal } from "./StoryUploadModal";
import { StoryArchiveDialog } from "./StoryArchiveDialog";
import { ActiveStoriesDialog } from "./ActiveStoriesDialog";
import { CreateHighlightGroupDialog } from "./CreateHighlightGroupDialog";
import { HighlightDetailSheet } from "./HighlightDetailSheet";
import { useCoachHighlights } from "@/hooks/useSocialMutations";

interface HighlightsSectionProps {
  canManage?: boolean;
}

export function HighlightsSection({ canManage = true }: HighlightsSectionProps) {
  const { data: highlights = [], isLoading } = useCoachHighlights();

  const [editMode, setEditMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isTemplateBuilderOpen, setIsTemplateBuilderOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isActiveStoriesOpen, setIsActiveStoriesOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  const handleStoryUpload = (_file: File, _categoryId: string) => {
    // Upload handled by StoryUploadModal — query invalidation refreshes highlights.
  };

  const selectedGroup = highlights.find((h) => h.category === selectedCategory) ?? null;

  return (
    <>
      <div className="glass rounded-xl border border-border p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Öne Çıkanlar</h3>
          {canManage && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsActiveStoriesOpen(true)}
                className="border-success/30 text-success hover:bg-success/10"
              >
                <Radio className="w-3 h-3 mr-1.5" />
                Aktif Hikayeler
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsArchiveOpen(true)}
                className="border-muted-foreground/30 text-muted-foreground hover:bg-muted"
              >
                <Archive className="w-3 h-3 mr-1.5" />
                Arşiv
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTemplateBuilderOpen(true)}
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                <Wand2 className="w-3 h-3 mr-1.5" />
                Şablon Editörü
              </Button>
              <Button
                variant={editMode ? "default" : "outline"}
                size="sm"
                onClick={() => setEditMode(!editMode)}
                className={cn(editMode && "bg-primary text-primary-foreground")}
              >
                <Edit2 className="w-3 h-3 mr-1.5" />
                Düzenle
              </Button>
            </div>
          )}
        </div>

        {/* Large Add Story Button */}
        {canManage && (
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="w-full mb-4 h-12 bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 text-primary hover:bg-primary/30 hover:text-primary-foreground transition-all group"
            variant="outline"
          >
            <Upload className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
            <span className="font-semibold">Yeni Hikaye Ekle</span>
          </Button>
        )}

        {/* Highlights Row */}
        <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-thin">
          {/* Add New Button */}
          {canManage && (
            <button
              onClick={() => setIsArchiveOpen(true)}
              className="flex flex-col items-center gap-2 shrink-0 group"
            >
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all group-hover:scale-105 glow-lime">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                Arşivden Seç
              </span>
            </button>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="w-4 h-4 animate-spin" />
              Yükleniyor...
            </div>
          )}

          {!isLoading && highlights.length === 0 && (
            <p className="text-xs text-muted-foreground py-4">
              Henüz öne çıkan hikaye yok — Arşiv'den bir hikaye seçip kategorisini belirleyerek öne çıkarın.
            </p>
          )}

          {/* Real Highlights */}
          {highlights.map((group) => {
            const isSelected = selectedCategory === group.category;
            const coverSrc = group.customCoverUrl ?? group.stories[0]?.media_url ?? null;
            const isVideoCover = coverSrc && /\.(mp4|webm|mov)$/i.test(coverSrc);

            return (
              <button
                key={group.category}
                onClick={() => setSelectedCategory(isSelected ? null : group.category)}
                className={cn(
                  "flex flex-col items-center gap-2 shrink-0 group transition-all",
                  editMode && "animate-pulse",
                  isSelected && "scale-110"
                )}
              >
                <div
                  className={cn(
                    "relative w-16 h-16 rounded-full overflow-hidden flex items-center justify-center transition-all",
                    "ring-2 ring-offset-2 ring-offset-background",
                    isSelected ? "ring-primary glow-lime" : "ring-transparent",
                    "group-hover:ring-primary/50 group-hover:scale-105",
                    !coverSrc && "bg-gradient-to-br from-primary to-primary/50"
                  )}
                >
                  {coverSrc && !isVideoCover ? (
                    <img src={coverSrc} alt={group.category} className="w-full h-full object-cover" />
                  ) : coverSrc && isVideoCover ? (
                    <video src={coverSrc} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <Star className="w-5 h-5 text-white" />
                  )}

                  {/* Count Badge */}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center">
                    <span className="text-[10px] font-bold text-foreground">{group.count}</span>
                  </div>

                  {editMode && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Edit2 className="w-2.5 h-2.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors text-center max-w-[70px] truncate">
                  {group.category}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Highlight Details */}
        {selectedGroup && (
          <div className="mt-4 pt-4 border-t border-border animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{selectedGroup.category}</p>
                <p className="text-xs text-muted-foreground">{selectedGroup.count} hikaye</p>
              </div>
              {canManage && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCropperCategory(selectedGroup.category)}
                    className="border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <ImagePlus className="w-3 h-3 mr-1" />
                    Kapak Fotoğrafı Değiştir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsArchiveOpen(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Hikaye Ekle
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={updateCategory.isPending}
                    onClick={async () => {
                      for (const story of selectedGroup.stories) {
                        await updateCategory.mutateAsync({ storyId: story.id, category: null });
                      }
                      setSelectedCategory(null);
                    }}
                  >
                    Kaldır
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <StoryTemplateBuilder
        isOpen={isTemplateBuilderOpen}
        onClose={() => setIsTemplateBuilderOpen(false)}
      />

      <StoryUploadModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        onUpload={handleStoryUpload}
      />

      <StoryArchiveDialog
        open={isArchiveOpen}
        onOpenChange={setIsArchiveOpen}
      />

      <ActiveStoriesDialog
        open={isActiveStoriesOpen}
        onOpenChange={setIsActiveStoriesOpen}
      />

      {cropperCategory && (
        <HighlightCoverCropper
          open={!!cropperCategory}
          onOpenChange={(o) => !o && setCropperCategory(null)}
          categoryName={cropperCategory}
          onSaved={(url) => {
            upsertMeta.mutate({ categoryName: cropperCategory, customCoverUrl: url });
            setCropperCategory(null);
          }}
        />
      )}
    </>
  );
}

import { useState } from "react";
import { Plus, Edit2, Star, MessageCircle, Trophy, Camera, Heart, Wand2, Upload, Archive, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StoryTemplateBuilder } from "./StoryTemplateBuilder";
import { StoryUploadModal } from "./StoryUploadModal";
import { StoryArchiveDialog } from "./StoryArchiveDialog";

interface Highlight {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  count: number;
}

const defaultHighlights: Highlight[] = [
  { id: "1", name: "Değişimler", icon: <Star className="w-5 h-5" />, color: "from-primary to-primary/50", count: 24 },
  { id: "2", name: "Soru-Cevap", icon: <MessageCircle className="w-5 h-5" />, color: "from-info to-info/50", count: 18 },
  { id: "3", name: "Başarılar", icon: <Trophy className="w-5 h-5" />, color: "from-warning to-warning/50", count: 12 },
  { id: "4", name: "Antrenman", icon: <Camera className="w-5 h-5" />, color: "from-success to-success/50", count: 45 },
  { id: "5", name: "Motivasyon", icon: <Heart className="w-5 h-5" />, color: "from-destructive to-destructive/50", count: 31 },
];

interface HighlightsSectionProps {
  canManage?: boolean;
}

export function HighlightsSection({ canManage = true }: HighlightsSectionProps) {
  const [highlights, setHighlights] = useState<Highlight[]>(defaultHighlights);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isTemplateBuilderOpen, setIsTemplateBuilderOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const handleStoryUpload = (file: File, categoryId: string) => {
    // Update highlight count for the selected category
    setHighlights((prev) =>
      prev.map((h) =>
        h.id === categoryId ? { ...h, count: h.count + 1 } : h
      )
    );
  };

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
              onClick={() => setIsUploadModalOpen(true)}
              className="flex flex-col items-center gap-2 shrink-0 group"
            >
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all group-hover:scale-105 glow-lime">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                Yeni Ekle
              </span>
            </button>
          )}

          {/* Existing Highlights */}
          {highlights.map((highlight) => (
            <button
              key={highlight.id}
              onClick={() => setSelectedId(selectedId === highlight.id ? null : highlight.id)}
              className={cn(
                "flex flex-col items-center gap-2 shrink-0 group transition-all",
                editMode && "animate-pulse",
                selectedId === highlight.id && "scale-110"
              )}
            >
              <div
                className={cn(
                  "relative w-16 h-16 rounded-full flex items-center justify-center transition-all",
                  "bg-gradient-to-br",
                  highlight.color,
                  "ring-2 ring-offset-2 ring-offset-background",
                  selectedId === highlight.id ? "ring-primary glow-lime" : "ring-transparent",
                  "group-hover:ring-primary/50 group-hover:scale-105"
                )}
              >
                <div className="text-white">{highlight.icon}</div>
                
                {/* Count Badge */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center">
                  <span className="text-[10px] font-bold text-foreground">{highlight.count}</span>
                </div>

                {/* Edit Indicator */}
                {editMode && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Edit2 className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors text-center max-w-[70px] truncate">
                {highlight.name}
              </span>
            </button>
          ))}
        </div>

        {/* Selected Highlight Details */}
        {selectedId && (
          <div className="mt-4 pt-4 border-t border-border animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {highlights.find((h) => h.id === selectedId)?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {highlights.find((h) => h.id === selectedId)?.count} hikaye
                </p>
              </div>
              {canManage && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setIsUploadModalOpen(true);
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Hikaye Ekle
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive">
                    Sil
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Story Template Builder Modal */}
      <StoryTemplateBuilder 
        isOpen={isTemplateBuilderOpen} 
        onClose={() => setIsTemplateBuilderOpen(false)} 
      />

      {/* Story Upload Modal */}
      <StoryUploadModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        onUpload={handleStoryUpload}
      />

      {/* Story Archive Dialog */}
      <StoryArchiveDialog
        open={isArchiveOpen}
        onOpenChange={setIsArchiveOpen}
      />
    </>
  );
}

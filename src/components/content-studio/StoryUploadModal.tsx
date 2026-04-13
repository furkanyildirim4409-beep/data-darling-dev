import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Image, X, Star, MessageCircle, Trophy, Camera, Heart, Video, Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCreateStory } from "@/hooks/useSocialMutations";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface StoryUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File, category: string) => void;
}

type MediaType = "image" | "video" | null;

const categories = [
  { id: "1", name: "Değişimler", icon: Star, color: "text-primary" },
  { id: "2", name: "Soru-Cevap", icon: MessageCircle, color: "text-info" },
  { id: "3", name: "Başarılar", icon: Trophy, color: "text-warning" },
  { id: "4", name: "Antrenman", icon: Camera, color: "text-success" },
  { id: "5", name: "Motivasyon", icon: Heart, color: "text-destructive" },
];

export function StoryUploadModal({ open, onOpenChange, onUpload }: StoryUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const { mutateAsync: createStory, isPending: isCreatingStory } = useCreateStory();

  const handleFileSelect = (file: File) => {
    if (file.type.startsWith("image/")) {
      setSelectedFile(file);
      setMediaType("image");
      setPreviewUrl(URL.createObjectURL(file));
    } else if (file.type.startsWith("video/")) {
      setSelectedFile(file);
      setMediaType("video");
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      toast.error("Lütfen geçerli bir görsel veya video dosyası seçin.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleUpload = async () => {
    if (!selectedFile || !selectedCategory || !user) return;

    try {
      setIsUploading(true);
      const ext = selectedFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("social-media")
        .upload(path, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("social-media")
        .getPublicUrl(path);

      const categoryName = categories.find(c => c.id === selectedCategory)?.name;
      await createStory({ media_url: urlData.publicUrl, duration_hours: 24, category: categoryName });

      // Notify parent for local highlight count update
      onUpload(selectedFile, selectedCategory);
      handleClose();
    } catch (err: any) {
      toast.error(`Yükleme başarısız: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setMediaType(null);
    setSelectedCategory("");
    onOpenChange(false);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setMediaType(null);
  };

  const isBusy = isUploading || isCreatingStory;
  const isVideo = mediaType === "video";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Yeni Hikaye Ekle
          </DialogTitle>
          <DialogDescription>
            Bir görsel veya video yükleyin ve hikaye kategorisini seçin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Media Upload Zone */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              {isVideo ? <Video className="w-4 h-4" /> : <Image className="w-4 h-4" />}
              Hikaye {isVideo ? "Videosu" : "Görseli"}
            </Label>
            
            {!previewUrl ? (
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer",
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <div className="flex gap-1">
                      <Image className="w-6 h-6 text-primary" />
                      <Video className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">Görsel veya video sürükleyip bırakın</p>
                  <p className="text-xs text-muted-foreground mb-3">veya dosya seçmek için tıklayın</p>
                  <Button variant="outline" size="sm" className="border-primary/30 text-primary">
                    <Upload className="w-3 h-3 mr-1.5" />
                    Dosya Seç
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-border">
                {isVideo ? (
                  <div className="relative">
                    <video src={previewUrl} className="w-full h-48 object-cover" muted loop autoPlay playsInline />
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white text-xs">
                      <Play className="w-3 h-3" />
                      Video
                    </div>
                  </div>
                ) : (
                  <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
                )}
                <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={clearFile} disabled={isBusy}>
                  <X className="w-4 h-4" />
                </Button>
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-xs text-white truncate">{selectedFile?.name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Category Selector */}
          <div className="space-y-2">
            <Label>Kategori Seçin</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Kategori seçin" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <Icon className={cn("w-4 h-4", category.color)} />
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Category Preview */}
          {selectedCategory && (
            <div className="glass rounded-lg p-3 border border-border">
              <div className="flex items-center gap-3">
                {(() => {
                  const cat = categories.find(c => c.id === selectedCategory);
                  if (!cat) return null;
                  const Icon = cat.icon;
                  return (
                    <>
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        selectedCategory === "1" ? "bg-primary/20" :
                        selectedCategory === "2" ? "bg-info/20" :
                        selectedCategory === "3" ? "bg-warning/20" :
                        selectedCategory === "4" ? "bg-success/20" :
                        "bg-destructive/20"
                      )}>
                        <Icon className={cn("w-5 h-5", cat.color)} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">Bu kategoriye hikaye eklenecek</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isBusy}>
            İptal
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !selectedCategory || isBusy}
            className="bg-primary text-primary-foreground"
          >
            {isBusy ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Paylaşılıyor...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-1.5" />
                Hikaye Yükle
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

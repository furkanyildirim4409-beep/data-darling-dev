import { useState, useRef, useEffect, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
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
import { Upload, Image, X, Video, Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCreateStory } from "@/hooks/useSocialMutations";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { storyCategories } from "@/data/storyCategories";

interface StoryUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File, category: string) => void;
}

type MediaType = "image" | "video" | null;

const categories = storyCategories;

export function StoryUploadModal({ open, onOpenChange, onUpload }: StoryUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  // Focus rect normalized in source coords (0..1)
  const [focusRect, setFocusRect] = useState<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 1, h: 1 });
  const [zoom, setZoom] = useState<number>(1); // 1 = max-fit 9:16, larger = tighter crop
  const [selectedCategory, setSelectedCategory] = useState<string>("none");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; startFx: number; startFy: number } | null>(null);

  const { user } = useAuth();
  const { mutateAsync: createStory, isPending: isCreatingStory } = useCreateStory();

  const TARGET_RATIO = 9 / 16;

  // Compute the maximum 9:16 rect (in normalized source coords) that fits inside the source.
  const computeMaxFitRect = (srcW: number, srcH: number) => {
    const srcRatio = srcW / srcH;
    if (srcRatio > TARGET_RATIO) {
      // wide → frame height = 1, width narrower
      const w = (srcH * TARGET_RATIO) / srcW;
      return { w, h: 1 };
    } else {
      const h = (srcW / TARGET_RATIO) / srcH;
      return { w: 1, h };
    }
  };

  // Reset focus rect to centered max-fit when zoom or media changes
  const resetFocusToCenter = useCallback((srcW: number, srcH: number, z: number = 1) => {
    const fit = computeMaxFitRect(srcW, srcH);
    const w = Math.min(1, fit.w / z);
    const h = Math.min(1, fit.h / z);
    setFocusRect({
      x: (1 - w) / 2,
      y: (1 - h) / 2,
      w,
      h,
    });
  }, []);

  // Apply zoom changes (keep focus centered around current center)
  useEffect(() => {
    if (!naturalSize) return;
    const fit = computeMaxFitRect(naturalSize.w, naturalSize.h);
    const w = Math.min(1, fit.w / zoom);
    const h = Math.min(1, fit.h / zoom);
    setFocusRect((prev) => {
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      let x = cx - w / 2;
      let y = cy - h / 2;
      x = Math.max(0, Math.min(1 - w, x));
      y = Math.max(0, Math.min(1 - h, y));
      return { x, y, w, h };
    });
  }, [zoom, naturalSize]);

  const cropImageWithRect = (file: File, rect: { x: number; y: number; w: number; h: number }): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const sx = rect.x * img.width;
        const sy = rect.y * img.height;
        const sW = rect.w * img.width;
        const sH = rect.h * img.height;
        const outW = Math.min(1080, Math.round(sW));
        const outH = Math.round(outW / TARGET_RATIO);
        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas context yok"));
          return;
        }
        ctx.drawImage(img, sx, sy, sW, sH, 0, 0, outW, outH);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            reject(new Error("Görsel kırpılamadı"));
            return;
          }
          const cropped = new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
          resolve(cropped);
        }, "image/jpeg", 0.92);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Görsel yüklenemedi"));
      };
      img.src = url;
    });
  };

  const cropVideoWithRect = (file: File, rect: { x: number; y: number; w: number; h: number }): Promise<File> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      const url = URL.createObjectURL(file);
      video.src = url;

      const cleanup = () => {
        try { URL.revokeObjectURL(url); } catch { /* noop */ }
      };

      video.onloadedmetadata = () => {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (!vw || !vh) {
          cleanup();
          reject(new Error("Video boyutu okunamadı"));
          return;
        }

        const sx = rect.x * vw;
        const sy = rect.y * vh;
        const sW = rect.w * vw;
        const sH = rect.h * vh;
        const outW = Math.min(720, Math.round(sW));
        const outH = Math.round(outW / TARGET_RATIO);

        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          reject(new Error("Canvas context yok"));
          return;
        }

        const candidates = [
          "video/mp4;codecs=avc1.42E01E",
          "video/webm;codecs=vp9",
          "video/webm;codecs=vp8",
          "video/webm",
        ];
        const mime = candidates.find((m) => (window as any).MediaRecorder?.isTypeSupported?.(m)) || "video/webm";
        const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";

        const stream = (canvas as HTMLCanvasElement).captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
        const chunks: BlobPart[] = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onerror = (e: any) => {
          cleanup();
          reject(new Error("Video kaydedilemedi: " + (e?.error?.message || "bilinmeyen")));
        };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mime });
          cleanup();
          if (!blob.size) {
            reject(new Error("Video çıktısı boş"));
            return;
          }
          const out = new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type: mime });
          resolve(out);
        };

        let rafId = 0;
        const drawFrame = () => {
          ctx.drawImage(video, sx, sy, sW, sH, 0, 0, outW, outH);
          if (!video.paused && !video.ended) {
            rafId = requestAnimationFrame(drawFrame);
          }
        };

        video.onended = () => {
          cancelAnimationFrame(rafId);
          if (recorder.state !== "inactive") recorder.stop();
        };

        video.onplay = () => { drawFrame(); };

        recorder.start();
        video.play().catch((err) => {
          cleanup();
          reject(err);
        });
      };

      video.onerror = () => {
        cleanup();
        reject(new Error("Video yüklenemedi"));
      };
    });
  };

  const handleFileSelect = (file: File) => {
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        setNaturalSize({ w: img.width, h: img.height });
        setZoom(1);
        resetFocusToCenter(img.width, img.height, 1);
      };
      img.src = url;
      setSelectedFile(file);
      setMediaType("image");
      setOriginalUrl(url);
      setPreviewUrl(url);
    } else if (file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      v.onloadedmetadata = () => {
        if (v.videoWidth && v.videoHeight) {
          setNaturalSize({ w: v.videoWidth, h: v.videoHeight });
          setZoom(1);
          resetFocusToCenter(v.videoWidth, v.videoHeight, 1);
        }
      };
      v.src = url;
      setSelectedFile(file);
      setMediaType("video");
      setOriginalUrl(url);
      setPreviewUrl(url);
    } else {
      toast.error("Lütfen geçerli bir görsel veya video dosyası seçin.");
    }
  };

  // Drag focus rect
  const onFocusPointerDown = (e: React.PointerEvent) => {
    if (!stageRef.current) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startFx: focusRect.x,
      startFy: focusRect.y,
    };
  };

  const onFocusPointerMove = (e: React.PointerEvent) => {
    const ds = dragStateRef.current;
    if (!ds || !stageRef.current || !naturalSize) return;
    const stage = stageRef.current.getBoundingClientRect();
    // Stage shows the source media at "contain" — compute its rendered rect
    const stageRatio = stage.width / stage.height;
    const srcRatio = naturalSize.w / naturalSize.h;
    let renderedW = stage.width, renderedH = stage.height;
    if (srcRatio > stageRatio) {
      renderedH = stage.width / srcRatio;
    } else {
      renderedW = stage.height * srcRatio;
    }
    const dxNorm = (e.clientX - ds.startX) / renderedW;
    const dyNorm = (e.clientY - ds.startY) / renderedH;
    let nx = ds.startFx + dxNorm;
    let ny = ds.startFy + dyNorm;
    nx = Math.max(0, Math.min(1 - focusRect.w, nx));
    ny = Math.max(0, Math.min(1 - focusRect.h, ny));
    setFocusRect((prev) => ({ ...prev, x: nx, y: ny }));
  };

  const onFocusPointerUp = (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    dragStateRef.current = null;
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
    if (!selectedFile || !user) return;

    try {
      setIsUploading(true);

      // Apply user-selected focus crop now
      let fileToUpload: File = selectedFile;
      try {
        if (mediaType === "image") {
          setProcessingLabel("Görsel kırpılıyor...");
          fileToUpload = await cropImageWithRect(selectedFile, focusRect);
        } else if (mediaType === "video") {
          setProcessingLabel("Video kırpılıyor...");
          fileToUpload = await cropVideoWithRect(selectedFile, focusRect);
        }
      } catch (cropErr: any) {
        toast.error(cropErr?.message || "Kırpma başarısız, orijinal dosya yükleniyor");
      } finally {
        setProcessingLabel("");
      }

      const ext = fileToUpload.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("social-media")
        .upload(path, fileToUpload);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("social-media")
        .getPublicUrl(path);

      const categoryName = selectedCategory && selectedCategory !== "none"
        ? categories.find(c => c.id === selectedCategory)?.name
        : undefined;
      await createStory({ media_url: urlData.publicUrl, duration_hours: 24, category: categoryName });

      onUpload(fileToUpload, selectedCategory);
      handleClose();
    } catch (err: any) {
      toast.error(`Yükleme başarısız: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (originalUrl) { try { URL.revokeObjectURL(originalUrl); } catch { /* noop */ } }
    setSelectedFile(null);
    setOriginalUrl(null);
    setPreviewUrl(null);
    setMediaType(null);
    setNaturalSize(null);
    setZoom(1);
    setFocusRect({ x: 0, y: 0, w: 1, h: 1 });
    setSelectedCategory("none");
    onOpenChange(false);
  };

  const clearFile = () => {
    if (originalUrl) { try { URL.revokeObjectURL(originalUrl); } catch { /* noop */ } }
    setSelectedFile(null);
    setOriginalUrl(null);
    setPreviewUrl(null);
    setMediaType(null);
    setNaturalSize(null);
    setZoom(1);
    setFocusRect({ x: 0, y: 0, w: 1, h: 1 });
  };

  const isBusy = isUploading || isCreatingStory || isProcessing;
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
            
            {isProcessing && !previewUrl ? (
              <div className="relative rounded-xl border border-border mx-auto bg-black flex flex-col items-center justify-center text-white" style={{ aspectRatio: "9 / 16", maxHeight: "60vh", width: "auto", minWidth: 220 }}>
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
                <p className="text-sm">{processingLabel || "İşleniyor..."}</p>
                <p className="text-xs text-white/60 mt-1">Lütfen bekleyin</p>
              </div>
            ) : !previewUrl ? (
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
              <div className="relative rounded-xl overflow-hidden border border-border mx-auto bg-black" style={{ aspectRatio: "9 / 16", maxHeight: "60vh", width: "auto" }}>
                {isVideo ? (
                  <div className="relative w-full h-full">
                    <video src={previewUrl} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white text-xs">
                      <Play className="w-3 h-3" />
                      Video
                    </div>
                  </div>
                ) : (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                )}
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white text-[10px] font-medium">
                  9:16
                </div>
                <Button variant="destructive" size="icon" className="absolute top-10 right-2 h-8 w-8" onClick={clearFile} disabled={isBusy}>
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
                        selectedCategory === "none" ? "bg-muted" :
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
                        <p className="text-xs text-muted-foreground">
                          {selectedCategory === "none"
                            ? "Normal 24 saatlik hikaye olarak paylaşılacak"
                            : "Bu kategoriye hikaye eklenecek"}
                        </p>
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
            disabled={!selectedFile || isBusy}
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

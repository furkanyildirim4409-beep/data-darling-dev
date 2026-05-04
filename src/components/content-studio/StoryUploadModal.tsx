import { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
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
const TARGET_RATIO = 9 / 16; // width / height

export function StoryUploadModal({ open, onOpenChange, onUpload }: StoryUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  // Stage = visible 9:16 frame. Media is rendered inside as: baseScale (cover) * zoom, panned by (pan.x, pan.y).
  const [stageSize, setStageSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [zoom, setZoom] = useState<number>(1); // ≥1, multiplies the cover-fit scale
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [selectedCategory, setSelectedCategory] = useState<string>("none");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);

  const { user } = useAuth();
  const { mutateAsync: createStory, isPending: isCreatingStory } = useCreateStory();

  // Contain-fit base scale: largest scale that fully fits inside the stage (no auto-crop)
  const baseScale = naturalSize && stageSize.w && stageSize.h
    ? Math.min(stageSize.w / naturalSize.w, stageSize.h / naturalSize.h)
    : 1;
  const effectiveScale = baseScale * zoom;
  const renderedW = naturalSize ? naturalSize.w * effectiveScale : 0;
  const renderedH = naturalSize ? naturalSize.h * effectiveScale : 0;

  // Clamp pan: if media is larger than stage on an axis, keep stage covered;
  // if smaller (contain mode, zoom=1), center it on that axis.
  const clampPan = useCallback((p: { x: number; y: number }) => {
    const x = renderedW >= stageSize.w
      ? Math.min(0, Math.max(stageSize.w - renderedW, p.x))
      : (stageSize.w - renderedW) / 2;
    const y = renderedH >= stageSize.h
      ? Math.min(0, Math.max(stageSize.h - renderedH, p.y))
      : (stageSize.h - renderedH) / 2;
    return { x, y };
  }, [stageSize.w, stageSize.h, renderedW, renderedH]);

  // Center on zoom/media change
  useEffect(() => {
    if (!naturalSize || !stageSize.w) return;
    setPan({
      x: (stageSize.w - renderedW) / 2,
      y: (stageSize.h - renderedH) / 2,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, naturalSize, stageSize.w, stageSize.h]);

  // Observe stage size (container is responsive 9:16)
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setStageSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [previewUrl]);

  // Crop helpers — pull current visible 9:16 area back to source-space rect
  const computeSourceCrop = () => {
    if (!naturalSize) return { sx: 0, sy: 0, sW: 0, sH: 0 };
    const sx = -pan.x / effectiveScale;
    const sy = -pan.y / effectiveScale;
    const sW = stageSize.w / effectiveScale;
    const sH = stageSize.h / effectiveScale;
    return {
      sx: Math.max(0, sx),
      sy: Math.max(0, sy),
      sW: Math.min(naturalSize.w - Math.max(0, sx), sW),
      sH: Math.min(naturalSize.h - Math.max(0, sy), sH),
    };
  };

  const cropImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const { sx, sy, sW, sH } = computeSourceCrop();
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
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
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }));
        }, "image/jpeg", 0.92);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Görsel yüklenemedi"));
      };
      img.src = url;
    });
  };

  const cropVideo = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const { sx, sy, sW, sH } = computeSourceCrop();
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      const url = URL.createObjectURL(file);
      video.src = url;
      const cleanup = () => { try { URL.revokeObjectURL(url); } catch { /* noop */ } };

      video.onloadedmetadata = () => {
        const outW = Math.min(720, Math.round(sW));
        const outH = Math.round(outW / TARGET_RATIO);
        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        if (!ctx) { cleanup(); reject(new Error("Canvas context yok")); return; }

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
        recorder.onerror = (e: any) => { cleanup(); reject(new Error("Video kaydedilemedi: " + (e?.error?.message || "bilinmeyen"))); };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mime });
          cleanup();
          if (!blob.size) { reject(new Error("Video çıktısı boş")); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type: mime }));
        };

        let rafId = 0;
        const drawFrame = () => {
          ctx.drawImage(video, sx, sy, sW, sH, 0, 0, outW, outH);
          if (!video.paused && !video.ended) rafId = requestAnimationFrame(drawFrame);
        };
        video.onended = () => { cancelAnimationFrame(rafId); if (recorder.state !== "inactive") recorder.stop(); };
        video.onplay = () => { drawFrame(); };
        recorder.start();
        video.play().catch((err) => { cleanup(); reject(err); });
      };

      video.onerror = () => { cleanup(); reject(new Error("Video yüklenemedi")); };
    });
  };

  const handleFileSelect = (file: File) => {
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => { setNaturalSize({ w: img.width, h: img.height }); setZoom(1); };
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

  // Pan via drag
  const onPointerDown = (e: React.PointerEvent) => {
    if (!naturalSize) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const ds = dragStateRef.current;
    if (!ds) return;
    const next = clampPan({ x: ds.startPanX + (e.clientX - ds.startX), y: ds.startPanY + (e.clientY - ds.startY) });
    setPan(next);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    dragStateRef.current = null;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleUpload = async () => {
    if (!selectedFile || !user) return;
    try {
      setIsUploading(true);
      let fileToUpload: File = selectedFile;
      try {
        if (mediaType === "image") {
          setProcessingLabel("Görsel kırpılıyor...");
          fileToUpload = await cropImage(selectedFile);
        } else if (mediaType === "video") {
          setProcessingLabel("Video kırpılıyor...");
          fileToUpload = await cropVideo(selectedFile);
        }
      } catch (cropErr: any) {
        toast.error(cropErr?.message || "Kırpma başarısız, orijinal dosya yükleniyor");
      } finally {
        setProcessingLabel("");
      }

      const ext = fileToUpload.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("social-media").upload(path, fileToUpload);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("social-media").getPublicUrl(path);

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

  const resetState = () => {
    if (originalUrl) { try { URL.revokeObjectURL(originalUrl); } catch { /* noop */ } }
    setSelectedFile(null);
    setOriginalUrl(null);
    setPreviewUrl(null);
    setMediaType(null);
    setNaturalSize(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleClose = () => {
    resetState();
    setSelectedCategory("none");
    onOpenChange(false);
  };

  const clearFile = () => { resetState(); };

  const isBusy = isUploading || isCreatingStory || isProcessing;
  const isVideo = mediaType === "video";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
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
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              {isVideo ? <Video className="w-4 h-4" /> : <Image className="w-4 h-4" />}
              Hikaye {isVideo ? "Videosu" : "Görseli"}
            </Label>

            {isProcessing && !previewUrl ? (
              <div className="relative rounded-xl border border-border mx-auto bg-black flex flex-col items-center justify-center text-white" style={{ aspectRatio: "9 / 16", maxHeight: "60vh", width: "auto", minWidth: 220 }}>
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
                <p className="text-sm">{processingLabel || "İşleniyor..."}</p>
              </div>
            ) : !previewUrl ? (
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer",
                  isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/30"
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
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); }}
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Sürükle ve yakınlaştır — çerçeveye giren alan paylaşılır</p>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">9:16</span>
                </div>

                {/* Stage = real 9:16 frame */}
                <div
                  ref={stageRef}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  className="relative mx-auto bg-black rounded-xl overflow-hidden border border-border select-none cursor-move touch-none"
                  style={{ aspectRatio: "9 / 16", maxHeight: "55vh", width: "auto" }}
                >
                  {naturalSize && (
                    isVideo ? (
                      <video
                        src={previewUrl}
                        className="absolute top-0 left-0 pointer-events-none max-w-none"
                        style={{
                          width: `${renderedW}px`,
                          height: `${renderedH}px`,
                          transform: `translate(${pan.x}px, ${pan.y}px)`,
                        }}
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                    ) : (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        draggable={false}
                        className="absolute top-0 left-0 pointer-events-none max-w-none"
                        style={{
                          width: `${renderedW}px`,
                          height: `${renderedH}px`,
                          transform: `translate(${pan.x}px, ${pan.y}px)`,
                        }}
                      />
                    )
                  )}

                  {/* Rule-of-thirds overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
                    <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
                    <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
                    <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
                  </div>

                  {isVideo && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white text-xs pointer-events-none">
                      <Play className="w-3 h-3" />
                      Video
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 z-10"
                    onClick={(e) => { e.stopPropagation(); clearFile(); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    disabled={isBusy}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-3 px-1">
                  <span className="text-[10px] text-muted-foreground w-10">Zoom</span>
                  <Slider
                    value={[zoom]}
                    min={1}
                    max={3}
                    step={0.05}
                    onValueChange={(v) => setZoom(v[0] ?? 1)}
                    className="flex-1"
                  />
                  <span className="text-[10px] text-muted-foreground w-10 text-right">{zoom.toFixed(2)}x</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{selectedFile?.name}</p>
              </div>
            )}
          </div>

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

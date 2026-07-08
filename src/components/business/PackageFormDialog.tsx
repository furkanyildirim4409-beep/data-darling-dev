import { useEffect, useRef, useState, useCallback } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Plus, Pill, X, Eye, Pencil, Bold, Italic, Heading2, List, CornerDownLeft, Image as ImageIcon, Trash2, Sparkles, Video, Upload, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCoachContract } from "@/hooks/useCoachContract";

import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { CoachingPackage, PackageInput } from "@/hooks/useCoachPackages";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPackage?: CoachingPackage | null;
  onSubmit: (values: PackageInput) => Promise<boolean | void>;
}

const DURATION_OPTIONS = [1, 3, 6, 12];
const MAX_GALLERY = 4;

export function PackageFormDialog({ open, onOpenChange, initialPackage, onSubmit }: Props) {
  const { hasContract, isLoading: contractLoading } = useCoachContract();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState<string>("");
  const [duration, setDuration] = useState<number>(1);
  const [description, setDescription] = useState("");
  const [richDescription, setRichDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([""]);
  const [featuresList, setFeaturesList] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [galleryUploading, setGalleryUploading] = useState<Record<number, boolean>>({});

  const STORAGE_BUCKET = "coaching-packages";
  const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
  const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

  const uploadToStorage = useCallback(async (file: File): Promise<string | null> => {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const path = `package-assets/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
    if (error) {
      toast.error(`Yükleme başarısız: ${error.message}`);
      return null;
    }
    const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return publicUrl;
  }, []);

  const handleVideoFile = useCallback(async (file: File) => {
    const okType = file.type === "video/mp4" || file.type === "video/quicktime" || /\.(mp4|mov|m4v)$/i.test(file.name);
    if (!okType) { toast.error("Yalnızca MP4 / MOV kabul edilir"); return; }
    if (file.size > MAX_VIDEO_BYTES) { toast.error("Video 200MB sınırını aşıyor"); return; }
    setVideoUploading(true);
    setVideoProgress(15);
    const tick = window.setInterval(() => setVideoProgress((p) => (p < 85 ? p + 7 : p)), 400);
    const url = await uploadToStorage(file);
    window.clearInterval(tick);
    setVideoProgress(100);
    if (url) setVideoUrl(url);
    setTimeout(() => { setVideoUploading(false); setVideoProgress(0); }, 350);
  }, [uploadToStorage]);

  const handleGalleryFile = useCallback(async (file: File, slotIndex: number) => {
    if (!file.type.startsWith("image/")) { toast.error("Yalnızca görsel dosyaları"); return; }
    if (file.size > MAX_IMAGE_BYTES) { toast.error("Görsel 8MB sınırını aşıyor"); return; }
    setGalleryUploading((m) => ({ ...m, [slotIndex]: true }));
    const url = await uploadToStorage(file);
    if (url) {
      setGalleryUrls((prev) => prev.map((u, i) => (i === slotIndex ? url : u)));
    }
    setGalleryUploading((m) => { const n = { ...m }; delete n[slotIndex]; return n; });
  }, [uploadToStorage]);

  const anyUploading = videoUploading || Object.keys(galleryUploading).length > 0;

  const richRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(initialPackage?.title ?? "");
      setPrice(initialPackage ? String(initialPackage.price) : "");
      setDuration(initialPackage?.duration_months ?? 1);
      setDescription(initialPackage?.description ?? "");
      setRichDescription(initialPackage?.rich_description ?? "");
      setVideoUrl(initialPackage?.video_url ?? "");
      const gallery = initialPackage?.gallery_urls ?? [];
      setGalleryUrls(gallery.length ? gallery.slice(0, MAX_GALLERY) : [""]);
      const fl = initialPackage?.features_list?.length
        ? initialPackage.features_list
        : initialPackage?.features ?? [];
      setFeaturesList(fl);
      setFeatureInput("");
      setShowPreview(false);
    }
  }, [open, initialPackage]);

  const wrapSelection = (before: string, after: string = before) => {
    const ta = richRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const value = richDescription;
    const selected = value.slice(start, end) || "metin";
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    setRichDescription(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const insertAtCursor = (snippet: string) => {
    const ta = richRef.current;
    if (!ta) {
      setRichDescription((v) => v + snippet);
      return;
    }
    const start = ta.selectionStart ?? richDescription.length;
    const end = ta.selectionEnd ?? richDescription.length;
    const next = richDescription.slice(0, start) + snippet + richDescription.slice(end);
    setRichDescription(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + snippet.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const addFeature = () => {
    const v = featureInput.trim();
    if (!v) return;
    if (featuresList.includes(v)) {
      setFeatureInput("");
      return;
    }
    setFeaturesList((prev) => [...prev, v]);
    setFeatureInput("");
  };

  const removeFeature = (idx: number) => {
    setFeaturesList((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateGallery = (idx: number, value: string) => {
    setGalleryUrls((prev) => prev.map((u, i) => (i === idx ? value : u)));
  };

  const addGallerySlot = () => {
    setGalleryUrls((prev) => (prev.length >= MAX_GALLERY ? prev : [...prev, ""]));
  };

  const removeGallerySlot = (idx: number) => {
    setGalleryUrls((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [""];
    });
  };

  const handleSubmit = async () => {
    if (videoUploading || Object.keys(galleryUploading).length > 0) {
      toast.error("Medya yüklenirken kaydedilemez");
      return;
    }
    if (!title.trim()) {
      toast.error("Paket adı gerekli");
      return;
    }
    const priceNum = Number(price);
    if (!priceNum || priceNum <= 0) {
      toast.error("Geçerli bir fiyat girin");
      return;
    }
    setSaving(true);
    const cleanedGallery = galleryUrls.map((u) => u.trim()).filter(Boolean).slice(0, MAX_GALLERY);
    const ok = await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      price: priceNum,
      duration_months: duration,
      features: featuresList,
      features_list: featuresList,
      rich_description: richDescription.trim() || null,
      video_url: videoUrl.trim() || null,
      gallery_urls: cleanedGallery,
      is_active: initialPackage?.is_active ?? true,
    });
    setSaving(false);
    if (ok !== false) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            {initialPackage ? "Paketi Düzenle" : "Yeni Premium Paket"}
          </DialogTitle>
          <DialogDescription>
            Yüksek dönüşümlü, medya zengini bir koçluk vitrini oluştur.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {!contractLoading && !hasContract && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Koçluk Sözleşmesi eksik</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  Paket satışı yapabilmek için Ayarlar'dan Koçluk Sözleşmesi şablonunuzu oluşturup
                  onaylamanız gerekmektedir.
                </p>
                <RouterLink
                  to="/settings"
                  className="inline-flex text-xs underline underline-offset-2 text-destructive-foreground hover:opacity-80"
                  onClick={() => onOpenChange(false)}
                >
                  Ayarlar → Koçluk Sözleşmesi'ne git
                </RouterLink>
              </AlertDescription>
            </Alert>
          )}
          {/* TOP CORE */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pkg-title">Paket Adı</Label>
              <Input
                id="pkg-title"
                placeholder="Örn. Elite Performans"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pkg-price">Fiyat (₺)</Label>
                <Input
                  id="pkg-price"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Süre (Ay)</Label>
                <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {DURATION_OPTIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} Ay
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pkg-desc">Kısa Açıklama</Label>
              <Textarea
                id="pkg-desc"
                placeholder="Listelemede görünecek tek cümlelik tagline..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* SECTION A — RICH TEXT */}
          <section className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="flex items-center gap-2 text-sm">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Zengin Açıklama (HTML destekli)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setShowPreview((v) => !v)}
              >
                {showPreview ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPreview ? "Düzenle" : "Önizleme"}
              </Button>
            </div>

            {!showPreview && (
              <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-background/40 p-1">
                <ToolbarBtn onClick={() => wrapSelection("<b>", "</b>")} icon={<Bold className="w-3.5 h-3.5" />} label="Kalın" />
                <ToolbarBtn onClick={() => wrapSelection("<i>", "</i>")} icon={<Italic className="w-3.5 h-3.5" />} label="İtalik" />
                <ToolbarBtn onClick={() => wrapSelection("<h3>", "</h3>")} icon={<Heading2 className="w-3.5 h-3.5" />} label="Başlık" />
                <ToolbarBtn onClick={() => insertAtCursor("\n<ul>\n  <li>Madde</li>\n  <li>Madde</li>\n</ul>\n")} icon={<List className="w-3.5 h-3.5" />} label="Liste" />
                <ToolbarBtn onClick={() => insertAtCursor("<br/>")} icon={<CornerDownLeft className="w-3.5 h-3.5" />} label="Satır" />
              </div>
            )}

            {showPreview ? (
              <div
                className="prose prose-invert prose-sm max-w-none min-h-[180px] rounded-lg border border-border bg-background/40 p-4 text-foreground"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    richDescription.trim() ||
                      '<p class="text-muted-foreground italic">Önizleme için zengin açıklama yaz...</p>',
                    {
                      USE_PROFILES: { html: true },
                      FORBID_TAGS: ["style", "script", "form", "iframe", "object", "embed"],
                      FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
                    },
                  ),
                }}
              />

            ) : (
              <Textarea
                ref={richRef}
                placeholder={`<h3>Neler Sunuyorum?</h3>\n<p>Sporculara <b>bireyselleştirilmiş</b> programlar...</p>\n<ul><li>1-1 görüşme</li></ul>`}
                value={richDescription}
                onChange={(e) => setRichDescription(e.target.value)}
                rows={8}
                className="font-mono text-xs leading-relaxed"
              />
            )}
          </section>

          {/* SECTION B — MEDIA */}
          <section className="rounded-xl border border-border bg-secondary/20 p-4 space-y-5">
            {/* VIDEO DROPZONE */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Video className="w-3.5 h-3.5 text-primary" />
                Tanıtım Videosu (MP4 / MOV — max 200MB)
              </Label>

              {videoUrl && !videoUploading ? (
                <div className="rounded-xl border border-white/10 bg-black/40 p-2 space-y-2">
                  <video src={videoUrl} controls className="w-full rounded-lg max-h-64 bg-black" />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground truncate">{videoUrl}</span>
                    <div className="flex items-center gap-1">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="video/mp4,video/quicktime"
                          className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoFile(f); e.target.value = ""; }}
                        />
                        <span className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-xs hover:bg-secondary/60">
                          <Upload className="w-3 h-3" /> Değiştir
                        </span>
                      </label>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setVideoUrl("")}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <label
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.01] hover:border-primary/40 hover:bg-white/[0.02] transition cursor-pointer px-4 py-8 ${videoUploading ? "pointer-events-none opacity-90" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleVideoFile(f);
                  }}
                >
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime"
                    className="hidden"
                    disabled={videoUploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoFile(f); e.target.value = ""; }}
                  />
                  {videoUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      <span className="text-xs text-muted-foreground">Yükleniyor… {videoProgress}%</span>
                      <Progress value={videoProgress} className="h-1.5 w-full max-w-xs" />
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-primary/80" />
                      <span className="text-sm font-medium">MP4 dosyasını sürükleyin veya tıklayın</span>
                      <span className="text-[11px] text-muted-foreground">H.264 önerilir · 200MB sınır</span>
                    </>
                  )}
                </label>
              )}
            </div>

            {/* GALLERY DROPZONES */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm">
                  <ImageIcon className="w-3.5 h-3.5 text-primary" />
                  Görsel Galeri ({galleryUrls.filter(Boolean).length}/{MAX_GALLERY})
                </Label>
                {galleryUrls.length < MAX_GALLERY && (
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addGallerySlot}>
                    <Plus className="w-3 h-3" /> Slot
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {galleryUrls.map((url, idx) => {
                  const uploading = !!galleryUploading[idx];
                  return (
                    <div key={idx} className="relative">
                      {url && !uploading ? (
                        <div className="group relative rounded-xl overflow-hidden border border-white/10 bg-black/40 aspect-video">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end justify-end p-2 gap-1">
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleGalleryFile(f, idx); e.target.value = ""; }}
                              />
                              <span className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-background/80 border border-border text-xs">
                                <Upload className="w-3 h-3" /> Değiştir
                              </span>
                            </label>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 bg-background/80 text-muted-foreground hover:text-destructive" onClick={() => removeGallerySlot(idx)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <label
                          className={`flex flex-col items-center justify-center gap-1.5 aspect-video rounded-xl border border-dashed border-white/10 bg-white/[0.01] hover:border-primary/40 hover:bg-white/[0.02] transition cursor-pointer ${uploading ? "pointer-events-none" : ""}`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const f = e.dataTransfer.files?.[0];
                            if (f) handleGalleryFile(f, idx);
                          }}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploading}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleGalleryFile(f, idx); e.target.value = ""; }}
                          />
                          {uploading ? (
                            <>
                              <Loader2 className="w-4 h-4 text-primary animate-spin" />
                              <span className="text-[11px] text-muted-foreground">Yükleniyor…</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-4 h-4 text-primary/80" />
                              <span className="text-[11px] font-medium">Görsel ekle</span>
                              <span className="text-[10px] text-muted-foreground">JPG / PNG · max 8MB</span>
                            </>
                          )}
                        </label>
                      )}
                      {url && !uploading && galleryUrls.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border border-border text-muted-foreground hover:text-destructive"
                          onClick={() => removeGallerySlot(idx)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>


          {/* SECTION C — FEATURES */}
          <section className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Öğrenci Avantajları
            </Label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Örn. Haftalık 1-1 Görüntülü Canlı Check-In"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFeature();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addFeature}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {featuresList.length === 0 ? (
              <p className="text-xs text-muted-foreground">Henüz avantaj eklenmedi.</p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {featuresList.map((f, i) => (
                  <span
                    key={`${f}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.55),0_0_12px_hsl(var(--primary)/0.35)] transition-shadow"
                  >
                    <Pill className="w-3 h-3 text-primary" />
                    {f}
                    <button
                      type="button"
                      onClick={() => removeFeature(i)}
                      className="ml-1 text-muted-foreground hover:text-destructive"
                      aria-label="Kaldır"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            İptal
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSubmit}
            disabled={saving || anyUploading}
          >
            {anyUploading ? "Medya yükleniyor..." : saving ? "Kaydediliyor..." : initialPackage ? "Güncelle" : "Oluştur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToolbarBtn({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
      onClick={onClick}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}

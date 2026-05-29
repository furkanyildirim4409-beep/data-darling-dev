import { useEffect, useRef, useState } from "react";
import { Plus, Pill, X, Eye, Pencil, Bold, Italic, Heading2, List, CornerDownLeft, Image as ImageIcon, Trash2, Sparkles, Video } from "lucide-react";
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
                  __html:
                    richDescription.trim() ||
                    '<p class="text-muted-foreground italic">Önizleme için zengin açıklama yaz...</p>',
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
          <section className="rounded-xl border border-border bg-secondary/20 p-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm">
                <Video className="w-3.5 h-3.5 text-primary" />
                Pazarlama / Tanıtım Videosu Linki (YouTube/Vimeo Embed)
              </Label>
              <Input
                placeholder="https://www.youtube.com/embed/xxxxxx veya https://player.vimeo.com/video/xxxxxx"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>

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
                {galleryUrls.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-lg border border-border bg-background/40 p-2">
                    <div className="w-12 h-12 rounded-md bg-muted/50 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {url ? (
                        <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => ((e.currentTarget.style.display = "none"))} />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
                      )}
                    </div>
                    <Input
                      placeholder="https://...image.jpg"
                      value={url}
                      onChange={(e) => updateGallery(idx, e.target.value)}
                      className="h-9 text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeGallerySlot(idx)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
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
            disabled={saving}
          >
            {saving ? "Kaydediliyor..." : initialPackage ? "Güncelle" : "Oluştur"}
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

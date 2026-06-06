import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
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
import {
  Sparkles,
  Type,
  Layers,
  Play,
  Image,
  Check,
  Eye,
  Wand2,
  Upload,
  Trash2,
  Link as LinkIcon,
  Rocket,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { toBlob } from "html-to-image";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCreateStory } from "@/hooks/useSocialMutations";

// Overlay Templates
const overlayTemplates = [
  { id: "gradient-lime", name: "Neon Yeşil", style: "linear-gradient(135deg, hsl(68 100% 50% / 0.3) 0%, transparent 100%)", border: "hsl(68 100% 50% / 0.5)" },
  { id: "gradient-dark", name: "Karanlık Güç", style: "linear-gradient(180deg, transparent 0%, hsl(0 0% 0% / 0.8) 100%)", border: "hsl(0 0% 30%)" },
  { id: "gradient-purple", name: "Siber Mor", style: "linear-gradient(135deg, hsl(263 70% 50% / 0.4) 0%, hsl(300 60% 40% / 0.3) 100%)", border: "hsl(263 70% 50% / 0.5)" },
  { id: "gradient-fire", name: "Ateş", style: "linear-gradient(135deg, hsl(25 95% 53% / 0.4) 0%, hsl(0 84% 60% / 0.3) 100%)", border: "hsl(25 95% 53% / 0.5)" },
  { id: "vignette", name: "Vinyet", style: "radial-gradient(circle, transparent 40%, hsl(0 0% 0% / 0.7) 100%)", border: "hsl(0 0% 20%)" },
  { id: "scan-lines", name: "Tarama", style: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(68 100% 50% / 0.03) 2px, hsl(68 100% 50% / 0.03) 4px)", border: "hsl(68 100% 50% / 0.3)" },
];

const fontOptions = [
  { id: "inter", name: "Inter", family: "'Inter', sans-serif", weight: "700" },
  { id: "jetbrains", name: "JetBrains Mono", family: "'JetBrains Mono', monospace", weight: "600" },
  { id: "impact", name: "Impact", family: "Impact, sans-serif", weight: "400" },
  { id: "bebas", name: "Bebas Neue", family: "'Bebas Neue', sans-serif", weight: "400" },
  { id: "oswald", name: "Oswald", family: "'Oswald', sans-serif", weight: "700" },
  { id: "playfair", name: "Playfair", family: "'Playfair Display', serif", weight: "700" },
];

const animationEffects = [
  { id: "none", name: "Yok", class: "" },
  { id: "fade-in", name: "Belirme", class: "animate-fade-in" },
  { id: "scale-in", name: "Büyüme", class: "animate-scale-in" },
  { id: "pulse", name: "Nabız", class: "animate-pulse" },
  { id: "bounce", name: "Zıplama", class: "animate-bounce" },
];

const textPositions = [
  { id: "top", name: "Üst", align: "items-start pt-12" },
  { id: "center", name: "Orta", align: "items-center" },
  { id: "bottom", name: "Alt", align: "items-end pb-12" },
];

interface StoryTemplateBuilderProps {
  isOpen: boolean;
  onClose: () => void;
}

const SectionLabel = ({ children, icon: Icon }: { children: React.ReactNode; icon?: any }) => (
  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-2 font-semibold">
    {Icon && <Icon className="w-3.5 h-3.5 text-primary" />}
    {children}
  </Label>
);

export function StoryTemplateBuilder({ isOpen, onClose }: StoryTemplateBuilderProps) {
  const { user } = useAuth();
  const { mutateAsync: createStory, isPending: isCreating } = useCreateStory();

  const [selectedOverlay, setSelectedOverlay] = useState(overlayTemplates[0]);
  const [selectedFont, setSelectedFont] = useState(fontOptions[0]);
  const [selectedAnimation, setSelectedAnimation] = useState(animationEffects[0]);
  const [selectedPosition, setSelectedPosition] = useState(textPositions[2]);
  const [storyText, setStoryText] = useState("DYNABOLIC");
  const [subText, setSubText] = useState("Dönüşümün Başlangıcı");
  const [fontSize, setFontSize] = useState([48]);
  const [textColor, setTextColor] = useState("#CDFF00");
  const [showLogo, setShowLogo] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);
  const [linkUrl, setLinkUrl] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const [customBackgroundUrl, setCustomBackgroundUrl] = useState<string | null>(null);
  const [isBackgroundVideo, setIsBackgroundVideo] = useState(false);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  const refreshPreview = () => setPreviewKey((p) => p + 1);

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("video/")) {
      setIsBackgroundVideo(true);
      setCustomBackgroundUrl(URL.createObjectURL(file));
      toast({ title: "Video Yüklendi", description: "Arka plan videosu eklendi." });
    } else if (file.type.startsWith("image/")) {
      setIsBackgroundVideo(false);
      setCustomBackgroundUrl(URL.createObjectURL(file));
      toast({ title: "Görsel Yüklendi", description: "Arka plan görseli eklendi." });
    } else {
      toast({ title: "Hata", description: "Geçerli bir görsel/video seçin.", variant: "destructive" });
    }
  };

  const clearBackground = () => {
    setCustomBackgroundUrl(null);
    setIsBackgroundVideo(false);
    if (backgroundInputRef.current) backgroundInputRef.current.value = "";
  };

  const validateLink = (): string | null => {
    const v = linkUrl.trim();
    if (!v) return null;
    try {
      const u = new URL(v);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error("invalid");
      return u.toString();
    } catch {
      toast({ title: "Geçersiz Link", description: "Lütfen https:// ile başlayan geçerli bir URL girin.", variant: "destructive" });
      return "__invalid__";
    }
  };

  const handlePublish = async () => {
    if (!user) {
      toast({ title: "Oturum gerekli", variant: "destructive" });
      return;
    }
    const validatedLink = validateLink();
    if (validatedLink === "__invalid__") return;

    const node = captureRef.current;
    if (!node) return;

    try {
      setIsPublishing(true);

      const blob = await toBlob(node, {
        pixelRatio: 4,
        cacheBust: true,
        backgroundColor: "#000",
      });
      if (!blob) throw new Error("Görüntü oluşturulamadı");

      const path = `${user.id}/${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("social-media")
        .upload(path, blob, { contentType: "image/png" });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("social-media").getPublicUrl(path);

      await createStory({
        media_url: urlData.publicUrl,
        duration_hours: 24,
        link_url: validatedLink ?? undefined,
      });

      onClose();
    } catch (err: any) {
      toast({ title: "Paylaşılamadı", description: err?.message || "Bilinmeyen hata", variant: "destructive" });
    } finally {
      setIsPublishing(false);
    }
  };

  const publishing = isPublishing || isCreating;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass border-border max-w-5xl w-[95vw] h-[90vh] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <div className="flex flex-col md:flex-row h-full w-full max-h-[85vh] md:max-h-none overflow-y-auto md:overflow-hidden">
          {/* Controls Panel */}
          <div className="w-full md:w-80 md:border-r border-b md:border-b-0 border-border flex flex-col md:h-full">
            <DialogHeader className="p-4 border-b border-border shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />
                Hikaye Şablon Editörü
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 md:overflow-y-auto">
              <div className="p-4 space-y-5">
                {/* Background */}
                <div className="space-y-2">
                  <SectionLabel icon={Upload}>Arka Plan</SectionLabel>
                  <input
                    ref={backgroundInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleBackgroundUpload}
                  />
                  {!customBackgroundUrl ? (
                    <Button
                      variant="outline"
                      className="w-full border-dashed border-2 h-16 hover:border-primary/50"
                      onClick={() => backgroundInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Görsel veya Video Yükle</span>
                      </div>
                    </Button>
                  ) : (
                    <div className="relative rounded-lg overflow-hidden border border-border">
                      {isBackgroundVideo ? (
                        <video src={customBackgroundUrl} className="w-full h-20 object-cover" muted loop autoPlay />
                      ) : (
                        <img src={customBackgroundUrl} alt="bg" className="w-full h-20 object-cover" />
                      )}
                      <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={clearBackground}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Overlay */}
                <div className="space-y-2 border-t border-border/50 pt-4">
                  <SectionLabel icon={Layers}>Kaplama Stili</SectionLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {overlayTemplates.map((overlay) => (
                      <button
                        key={overlay.id}
                        onClick={() => setSelectedOverlay(overlay)}
                        className={cn(
                          "aspect-square rounded-lg border-2 transition-all overflow-hidden relative",
                          selectedOverlay.id === overlay.id
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border hover:border-muted-foreground"
                        )}
                      >
                        <div className="absolute inset-0 bg-muted" style={{ background: overlay.style }} />
                        {selectedOverlay.id === overlay.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                            <Check className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <span className="absolute bottom-1 left-1 right-1 text-[8px] text-center text-foreground/80 truncate">
                          {overlay.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text */}
                <div className="space-y-2 border-t border-border/50 pt-4">
                  <SectionLabel icon={Type}>Metin İçeriği</SectionLabel>
                  <Input value={storyText} onChange={(e) => setStoryText(e.target.value)} placeholder="Ana başlık" className="bg-background/50" />
                  <Input value={subText} onChange={(e) => setSubText(e.target.value)} placeholder="Alt başlık" className="bg-background/50" />
                </div>

                {/* Font */}
                <div className="space-y-2 border-t border-border/50 pt-4">
                  <SectionLabel>Yazı Tipi</SectionLabel>
                  <Select value={selectedFont.id} onValueChange={(val) => setSelectedFont(fontOptions.find((f) => f.id === val) || fontOptions[0])}>
                    <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {fontOptions.map((font) => (
                        <SelectItem key={font.id} value={font.id}>
                          <span style={{ fontFamily: font.family }}>{font.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Size */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <SectionLabel>Yazı Boyutu</SectionLabel>
                    <span className="text-xs text-muted-foreground font-mono">{fontSize[0]}px</span>
                  </div>
                  <Slider value={fontSize} onValueChange={setFontSize} min={24} max={72} step={2} />
                </div>

                {/* Color */}
                <div className="space-y-2">
                  <SectionLabel>Metin Rengi</SectionLabel>
                  <div className="flex gap-2">
                    {["#CDFF00", "#FFFFFF", "#FF6B6B", "#4ECDC4", "#FFE66D", "#A855F7"].map((color) => (
                      <button
                        key={color}
                        onClick={() => setTextColor(color)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all",
                          textColor === color ? "border-foreground scale-110" : "border-border hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Position */}
                <div className="space-y-2">
                  <SectionLabel>Metin Konumu</SectionLabel>
                  <div className="flex gap-2">
                    {textPositions.map((pos) => (
                      <Button
                        key={pos.id}
                        variant={selectedPosition.id === pos.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPosition(pos)}
                        className={cn(selectedPosition.id === pos.id && "bg-primary text-primary-foreground")}
                      >
                        {pos.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Animation */}
                <div className="space-y-2 border-t border-border/50 pt-4">
                  <SectionLabel icon={Play}>Animasyon Efekti</SectionLabel>
                  <Select value={selectedAnimation.id} onValueChange={(val) => setSelectedAnimation(animationEffects.find((a) => a.id === val) || animationEffects[0])}>
                    <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {animationEffects.map((anim) => (
                        <SelectItem key={anim.id} value={anim.id}>{anim.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Link */}
                <div className="space-y-2 border-t border-border/50 pt-4">
                  <SectionLabel icon={LinkIcon}>🔗 Yönlendirme Linki (Swipe Up)</SectionLabel>
                  <Input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://siteniz.com/teklif"
                    className="bg-background/50"
                    type="url"
                  />
                  <p className="text-[10px] text-muted-foreground">İzleyiciler yukarı kaydırarak bu adrese yönlendirilir.</p>
                </div>

                {/* Logo */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-primary" />
                    <span className="text-sm">Logo Göster</span>
                  </div>
                  <Button
                    variant={showLogo ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowLogo(!showLogo)}
                    className={cn(showLogo && "bg-primary text-primary-foreground")}
                  >
                    {showLogo ? "Açık" : "Kapalı"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-border space-y-2 shrink-0 bg-background/40">
              <Button onClick={refreshPreview} variant="outline" className="w-full" disabled={publishing}>
                <Eye className="w-4 h-4 mr-2" />
                Önizlemeyi Yenile
              </Button>
              <Button
                className="w-full bg-primary text-primary-foreground glow-lime"
                onClick={handlePublish}
                disabled={publishing}
              >
                {publishing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Paylaşılıyor...</>
                ) : (
                  <><Rocket className="w-4 h-4 mr-2" />🚀 Hikayeyi Paylaş</>
                )}
              </Button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="flex-1 bg-muted/20 flex flex-col md:overflow-y-auto">
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="font-medium text-foreground">Canlı Önizleme</h3>
              <span className="text-xs text-muted-foreground">1080 × 1920px (9:16)</span>
            </div>

            <div className="flex-1 flex items-center justify-center p-4 md:p-8 min-h-[480px]">
              <div className="relative">
                <div className="w-[220px] h-[390px] md:w-[270px] md:h-[480px] bg-black rounded-[32px] p-2 shadow-2xl shadow-primary/10 border-2 border-muted">
                  <div
                    ref={captureRef}
                    key={previewKey}
                    className="w-full h-full rounded-[26px] overflow-hidden relative bg-gradient-to-br from-muted to-background"
                  >
                    {customBackgroundUrl ? (
                      isBackgroundVideo ? (
                        <video src={customBackgroundUrl} className="absolute inset-0 w-full h-full object-cover" muted loop autoPlay playsInline />
                      ) : (
                        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${customBackgroundUrl}')` }} />
                      )
                    ) : (
                      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=1000&fit=crop')" }} />
                    )}

                    <div className="absolute inset-0 transition-all duration-500" style={{ background: selectedOverlay.style }} />

                    <div className={cn("absolute inset-0 flex flex-col justify-center px-6 text-center", selectedPosition.align, selectedAnimation.class)}>
                      {showLogo && (
                        <div className="mb-4">
                          <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center" style={{ backgroundColor: textColor, boxShadow: `0 0 20px ${textColor}40` }}>
                            <span className="text-black font-bold text-xl">D</span>
                          </div>
                        </div>
                      )}
                      <h2 className="font-bold tracking-tight leading-tight" style={{ fontFamily: selectedFont.family, fontWeight: selectedFont.weight, fontSize: `${fontSize[0] * 0.5}px`, color: textColor, textShadow: `0 0 30px ${textColor}60` }}>
                        {storyText}
                      </h2>
                      {subText && (
                        <p className="mt-2 text-white/80" style={{ fontFamily: selectedFont.family, fontSize: `${fontSize[0] * 0.25}px` }}>
                          {subText}
                        </p>
                      )}
                    </div>

                    <div className="absolute top-4 left-4 right-4 flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden bg-white/30">
                          <div className={cn("h-full rounded-full", i === 1 ? "w-full bg-white" : "w-0")} />
                        </div>
                      ))}
                    </div>

                    <div className="absolute top-8 left-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-primary-foreground font-bold text-xs">D</span>
                      </div>
                      <div>
                        <p className="text-white text-xs font-medium">dynabolic</p>
                        <p className="text-white/50 text-[10px]">şimdi</p>
                      </div>
                    </div>

                    <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-1">
                      <Sparkles className="w-4 h-4 text-white/60 animate-bounce" />
                      <span className="text-[10px] text-white/60">
                        {linkUrl.trim() ? "Bağlantıya kaydır" : "Yukarı kaydır"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

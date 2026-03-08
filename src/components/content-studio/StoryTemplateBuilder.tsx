import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Download,
  Eye,
  Wand2,
  X,
  Upload,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

// Overlay Templates
const overlayTemplates = [
  {
    id: "gradient-lime",
    name: "Neon Yeşil",
    style: "linear-gradient(135deg, hsl(68 100% 50% / 0.3) 0%, transparent 100%)",
    border: "hsl(68 100% 50% / 0.5)",
  },
  {
    id: "gradient-dark",
    name: "Karanlık Güç",
    style: "linear-gradient(180deg, transparent 0%, hsl(0 0% 0% / 0.8) 100%)",
    border: "hsl(0 0% 30%)",
  },
  {
    id: "gradient-purple",
    name: "Siber Mor",
    style: "linear-gradient(135deg, hsl(263 70% 50% / 0.4) 0%, hsl(300 60% 40% / 0.3) 100%)",
    border: "hsl(263 70% 50% / 0.5)",
  },
  {
    id: "gradient-fire",
    name: "Ateş",
    style: "linear-gradient(135deg, hsl(25 95% 53% / 0.4) 0%, hsl(0 84% 60% / 0.3) 100%)",
    border: "hsl(25 95% 53% / 0.5)",
  },
  {
    id: "vignette",
    name: "Vinyet",
    style: "radial-gradient(circle, transparent 40%, hsl(0 0% 0% / 0.7) 100%)",
    border: "hsl(0 0% 20%)",
  },
  {
    id: "scan-lines",
    name: "Tarama Çizgileri",
    style: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(68 100% 50% / 0.03) 2px, hsl(68 100% 50% / 0.03) 4px)",
    border: "hsl(68 100% 50% / 0.3)",
  },
];

// Font Options
const fontOptions = [
  { id: "inter", name: "Inter", family: "'Inter', sans-serif", weight: "700" },
  { id: "jetbrains", name: "JetBrains Mono", family: "'JetBrains Mono', monospace", weight: "600" },
  { id: "impact", name: "Impact", family: "Impact, sans-serif", weight: "400" },
  { id: "bebas", name: "Bebas Neue", family: "'Bebas Neue', sans-serif", weight: "400" },
  { id: "oswald", name: "Oswald", family: "'Oswald', sans-serif", weight: "700" },
  { id: "playfair", name: "Playfair", family: "'Playfair Display', serif", weight: "700" },
];

// Animation Effects
const animationEffects = [
  { id: "none", name: "Yok", class: "" },
  { id: "fade-in", name: "Belirme", class: "animate-fade-in" },
  { id: "scale-in", name: "Büyüme", class: "animate-scale-in" },
  { id: "slide-up", name: "Yukarı Kayma", class: "animate-[slideUp_0.5s_ease-out]" },
  { id: "pulse", name: "Nabız", class: "animate-pulse" },
  { id: "bounce", name: "Zıplama", class: "animate-bounce" },
  { id: "glow", name: "Parıltı", class: "animate-[glow_2s_ease-in-out_infinite]" },
];

// Text Positions
const textPositions = [
  { id: "top", name: "Üst", align: "items-start pt-12" },
  { id: "center", name: "Orta", align: "items-center" },
  { id: "bottom", name: "Alt", align: "items-end pb-12" },
];

interface StoryTemplateBuilderProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StoryTemplateBuilder({ isOpen, onClose }: StoryTemplateBuilderProps) {
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
  
  // Custom background state
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState<string | null>(null);
  const [isBackgroundVideo, setIsBackgroundVideo] = useState(false);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  const refreshPreview = () => {
    setPreviewKey((prev) => prev + 1);
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if video or image
    if (file.type.startsWith("video/")) {
      setIsBackgroundVideo(true);
      const url = URL.createObjectURL(file);
      setCustomBackgroundUrl(url);
      toast({
        title: "Video Yüklendi",
        description: "Arka plan videosu başarıyla eklendi.",
      });
    } else if (file.type.startsWith("image/")) {
      setIsBackgroundVideo(false);
      const url = URL.createObjectURL(file);
      setCustomBackgroundUrl(url);
      toast({
        title: "Görsel Yüklendi",
        description: "Arka plan görseli başarıyla eklendi.",
      });
    } else {
      toast({
        title: "Hata",
        description: "Lütfen geçerli bir görsel veya video dosyası seçin.",
        variant: "destructive",
      });
    }
  };

  const clearBackground = () => {
    setCustomBackgroundUrl(null);
    setIsBackgroundVideo(false);
    if (backgroundInputRef.current) {
      backgroundInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass border-border max-w-5xl h-[90vh] p-0 overflow-hidden">
        <div className="flex h-full">
          {/* Left Panel - Controls */}
          <div className="w-80 border-r border-border flex flex-col">
            <DialogHeader className="p-4 border-b border-border">
              <DialogTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />
                Hikaye Şablon Editörü
              </DialogTitle>
            </DialogHeader>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                {/* Background Upload */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Upload className="w-4 h-4 text-primary" />
                    Arka Plan
                  </Label>
                  
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
                        <span className="text-xs text-muted-foreground">
                          Görsel veya Video Yükle
                        </span>
                      </div>
                    </Button>
                  ) : (
                    <div className="relative rounded-lg overflow-hidden border border-border">
                      {isBackgroundVideo ? (
                        <video
                          src={customBackgroundUrl}
                          className="w-full h-20 object-cover"
                          muted
                          loop
                          autoPlay
                        />
                      ) : (
                        <img
                          src={customBackgroundUrl}
                          alt="Custom background"
                          className="w-full h-20 object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={clearBackground}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      <p className="absolute bottom-1 left-2 text-[10px] text-white">
                        {isBackgroundVideo ? "Video" : "Görsel"} yüklendi
                      </p>
                    </div>
                  )}
                </div>

                {/* Overlay Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    Kaplama Stili
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {overlayTemplates.map((overlay) => (
                      <button
                        key={overlay.id}
                        onClick={() => setSelectedOverlay(overlay)}
                        className={cn(
                          "aspect-square rounded-lg border-2 transition-all overflow-hidden relative group",
                          selectedOverlay.id === overlay.id
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border hover:border-muted-foreground"
                        )}
                      >
                        <div
                          className="absolute inset-0 bg-muted"
                          style={{ background: overlay.style }}
                        />
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

                {/* Text Input */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Type className="w-4 h-4 text-primary" />
                    Metin İçeriği
                  </Label>
                  <Input
                    value={storyText}
                    onChange={(e) => setStoryText(e.target.value)}
                    placeholder="Ana başlık"
                    className="bg-background/50"
                  />
                  <Input
                    value={subText}
                    onChange={(e) => setSubText(e.target.value)}
                    placeholder="Alt başlık"
                    className="bg-background/50"
                  />
                </div>

                {/* Font Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Yazı Tipi</Label>
                  <Select
                    value={selectedFont.id}
                    onValueChange={(val) =>
                      setSelectedFont(fontOptions.find((f) => f.id === val) || fontOptions[0])
                    }
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {fontOptions.map((font) => (
                        <SelectItem key={font.id} value={font.id}>
                          <span style={{ fontFamily: font.family }}>{font.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Font Size */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Yazı Boyutu</Label>
                    <span className="text-xs text-muted-foreground font-mono">{fontSize[0]}px</span>
                  </div>
                  <Slider
                    value={fontSize}
                    onValueChange={setFontSize}
                    min={24}
                    max={72}
                    step={2}
                    className="w-full"
                  />
                </div>

                {/* Text Color */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Metin Rengi</Label>
                  <div className="flex gap-2">
                    {["#CDFF00", "#FFFFFF", "#FF6B6B", "#4ECDC4", "#FFE66D", "#A855F7"].map(
                      (color) => (
                        <button
                          key={color}
                          onClick={() => setTextColor(color)}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-all",
                            textColor === color
                              ? "border-foreground scale-110"
                              : "border-border hover:scale-105"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      )
                    )}
                  </div>
                </div>

                {/* Text Position */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Metin Konumu</Label>
                  <div className="flex gap-2">
                    {textPositions.map((pos) => (
                      <Button
                        key={pos.id}
                        variant={selectedPosition.id === pos.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPosition(pos)}
                        className={cn(
                          selectedPosition.id === pos.id && "bg-primary text-primary-foreground"
                        )}
                      >
                        {pos.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Animation Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Play className="w-4 h-4 text-primary" />
                    Animasyon Efekti
                  </Label>
                  <Select
                    value={selectedAnimation.id}
                    onValueChange={(val) =>
                      setSelectedAnimation(
                        animationEffects.find((a) => a.id === val) || animationEffects[0]
                      )
                    }
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {animationEffects.map((anim) => (
                        <SelectItem key={anim.id} value={anim.id}>
                          {anim.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Logo Toggle */}
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
            </ScrollArea>

            {/* Actions */}
            <div className="p-4 border-t border-border space-y-2">
              <Button onClick={refreshPreview} variant="outline" className="w-full">
                <Eye className="w-4 h-4 mr-2" />
                Önizlemeyi Yenile
              </Button>
              <Button className="w-full bg-primary text-primary-foreground glow-lime">
                <Download className="w-4 h-4 mr-2" />
                Şablonu Kaydet
              </Button>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 bg-muted/20 flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-medium text-foreground">Canlı Önizleme</h3>
              <span className="text-xs text-muted-foreground">1080 × 1920px (9:16)</span>
            </div>

            <div className="flex-1 flex items-center justify-center p-8">
              {/* Phone Frame */}
              <div className="relative">
                <div className="w-[270px] h-[480px] bg-black rounded-[32px] p-2 shadow-2xl shadow-primary/10 border-2 border-muted">
                  {/* Screen */}
                  <div
                    key={previewKey}
                    className="w-full h-full rounded-[26px] overflow-hidden relative bg-gradient-to-br from-muted to-background"
                  >
                    {/* Background Image or Video */}
                    {customBackgroundUrl ? (
                      isBackgroundVideo ? (
                        <video
                          src={customBackgroundUrl}
                          className="absolute inset-0 w-full h-full object-cover"
                          muted
                          loop
                          autoPlay
                          playsInline
                        />
                      ) : (
                        <div
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url('${customBackgroundUrl}')` }}
                        />
                      )
                    ) : (
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                          backgroundImage:
                            "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=1000&fit=crop')",
                        }}
                      />
                    )}

                    {/* Overlay */}
                    <div
                      className="absolute inset-0 transition-all duration-500"
                      style={{ background: selectedOverlay.style }}
                    />

                    {/* Scan Lines Effect (optional) */}
                    {selectedOverlay.id === "scan-lines" && (
                      <div
                        className="absolute inset-0 pointer-events-none opacity-50"
                        style={{
                          background:
                            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(205,255,0,0.03) 2px, rgba(205,255,0,0.03) 4px)",
                        }}
                      />
                    )}

                    {/* Text Content */}
                    <div
                      className={cn(
                        "absolute inset-0 flex flex-col justify-center px-6 text-center",
                        selectedPosition.align,
                        selectedAnimation.class
                      )}
                    >
                      {/* Logo */}
                      {showLogo && (
                        <div className="mb-4">
                          <div
                            className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center"
                            style={{
                              backgroundColor: textColor,
                              boxShadow: `0 0 20px ${textColor}40`,
                            }}
                          >
                            <span className="text-black font-bold text-xl">D</span>
                          </div>
                        </div>
                      )}

                      {/* Main Text */}
                      <h2
                        className="font-bold tracking-tight leading-tight"
                        style={{
                          fontFamily: selectedFont.family,
                          fontWeight: selectedFont.weight,
                          fontSize: `${fontSize[0] * 0.5}px`,
                          color: textColor,
                          textShadow: `0 0 30px ${textColor}60`,
                        }}
                      >
                        {storyText}
                      </h2>

                      {/* Sub Text */}
                      {subText && (
                        <p
                          className="mt-2 text-white/80"
                          style={{
                            fontFamily: selectedFont.family,
                            fontSize: `${fontSize[0] * 0.25}px`,
                          }}
                        >
                          {subText}
                        </p>
                      )}
                    </div>

                    {/* Story Progress Bars */}
                    <div className="absolute top-4 left-4 right-4 flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="flex-1 h-0.5 rounded-full overflow-hidden bg-white/30"
                        >
                          <div
                            className={cn(
                              "h-full rounded-full",
                              i === 1 ? "w-full bg-white" : "w-0"
                            )}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Story Header */}
                    <div className="absolute top-8 left-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-primary-foreground font-bold text-xs">D</span>
                      </div>
                      <div>
                        <p className="text-white text-xs font-medium">dynabolic</p>
                        <p className="text-white/50 text-[10px]">2 saat önce</p>
                      </div>
                    </div>

                    {/* Swipe Up Indicator */}
                    <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-1">
                      <Sparkles className="w-4 h-4 text-white/60 animate-bounce" />
                      <span className="text-[10px] text-white/60">Yukarı kaydır</span>
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

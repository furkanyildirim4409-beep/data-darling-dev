import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Mic,
  AlertTriangle,
  Moon,
  Activity,
  Brain,
  Zap,
  ArrowRight,
  Keyboard,
  Dumbbell,
  Utensils,
  FileText,
} from "lucide-react";
import { Athlete, getAthletesNeedingAttention } from "@/data/athletes";

interface RapidResponseProps {
  onClose: () => void;
}

const riskLabels = {
  Low: "Düşük",
  Medium: "Orta",
  High: "Yüksek",
};

const checkInLabels = {
  completed: "tamamlandı",
  missed: "kaçırıldı",
  pending: "bekliyor",
};

export function RapidResponse({ onClose }: RapidResponseProps) {
  const athletes = getAthletesNeedingAttention();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [adjustedCalories, setAdjustedCalories] = useState<number | null>(null);
  const [intensityReduction, setIntensityReduction] = useState<number>(0);
  const [coachNote, setCoachNote] = useState("");
  const [processedCount, setProcessedCount] = useState(0);

  const currentAthlete = athletes[currentIndex];

  // Determine risk type for dynamic UI
  const isInjuryRisk = currentAthlete?.riskType === "injury" || currentAthlete?.injuryRisk === "High";
  const isNutritionRisk = currentAthlete?.riskType === "nutrition";

  const goToNext = useCallback(() => {
    if (currentIndex < athletes.length - 1) {
      setCurrentIndex((i) => i + 1);
      setAdjustedCalories(null);
      setIntensityReduction(0);
      setCoachNote("");
      setProcessedCount((c) => c + 1);
    } else {
      onClose();
    }
  }, [currentIndex, athletes.length, onClose]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setAdjustedCalories(null);
      setIntensityReduction(0);
      setCoachNote("");
    }
  }, [currentIndex]);

  const handleApprove = useCallback(() => {
    console.log("Approved:", currentAthlete.name, { 
      adjustedCalories, 
      intensityReduction: isInjuryRisk ? intensityReduction : null,
      coachNote 
    });
    goToNext();
  }, [currentAthlete, adjustedCalories, intensityReduction, isInjuryRisk, coachNote, goToNext]);

  const handleSkip = useCallback(() => {
    goToNext();
  }, [goToNext]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        handleApprove();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleApprove, goToPrev, handleSkip, onClose]);

  if (!currentAthlete) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Tamamlandı!</h2>
          <p className="text-muted-foreground mb-6">Dikkat gerektiren tüm sporcuları incelediniz.</p>
          <Button onClick={onClose} className="bg-primary text-primary-foreground">
            Panele Dön
          </Button>
        </div>
      </div>
    );
  }

  const initials = currentAthlete.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const checkIn = currentAthlete.latestCheckIn;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
            <X className="w-5 h-5 mr-2" />
            Odak Modundan Çık
          </Button>
          <div className="h-8 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">İlerleme</span>
            <span className="font-mono text-primary">
              {currentIndex + 1}/{athletes.length}
            </span>
          </div>
          <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / athletes.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Keyboard className="w-4 h-4" />
          <span>← Önceki</span>
          <span className="mx-1">|</span>
          <span>→ / Enter = Onayla</span>
          <span className="mx-1">|</span>
          <span>S = Atla</span>
          <span className="mx-1">|</span>
          <span>Esc = Çık</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Athlete Info */}
        <div className="flex-1 p-6 overflow-y-auto border-r border-border">
          {/* Athlete Header */}
          <div className="flex items-start gap-4 mb-6">
            <Avatar className="w-20 h-20 border-2 border-border">
              <AvatarImage src={currentAthlete.avatar} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-foreground">{currentAthlete.name}</h2>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-sm",
                    currentAthlete.injuryRisk === "High"
                      ? "bg-destructive/10 text-destructive border-destructive/20"
                      : currentAthlete.injuryRisk === "Medium"
                      ? "bg-warning/10 text-warning border-warning/20"
                      : "bg-success/10 text-success border-success/20"
                  )}
                >
                  {riskLabels[currentAthlete.injuryRisk]} Risk
                </Badge>
              </div>
              <p className="text-muted-foreground">{currentAthlete.sport} • {currentAthlete.tier}</p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="text-muted-foreground">
                  Son aktivite: <span className="text-foreground font-mono">{currentAthlete.lastActive}</span>
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    currentAthlete.checkInStatus === "completed"
                      ? "bg-success/10 text-success border-success/20"
                      : currentAthlete.checkInStatus === "missed"
                      ? "bg-destructive/10 text-destructive border-destructive/20"
                      : "bg-warning/10 text-warning border-warning/20"
                  )}
                >
                  Check-in: {checkInLabels[currentAthlete.checkInStatus]}
                </Badge>
              </div>
            </div>
          </div>

          {/* Alert Banner */}
          {(currentAthlete.injuryRisk === "High" || currentAthlete.checkInStatus === "missed") && (
            <div className="glass rounded-xl border border-destructive/30 bg-destructive/5 p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Dikkat Gerekiyor</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentAthlete.injuryRisk === "High" && "Yüksek sakatlanma riski tespit edildi. "}
                    {currentAthlete.checkInStatus === "missed" && "Son check-in kaçırıldı. "}
                    {currentAthlete.compliance < 60 && "Düşük uyumluluk skoru. "}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Current Program & Diet Summary */}
          <div className="glass rounded-xl border border-primary/30 p-5 mb-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Aktif Program & Diyet
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell className="w-4 h-4 text-primary" />
                  <p className="text-sm text-muted-foreground">Antrenman Programı</p>
                </div>
                <p className="text-lg font-bold text-foreground">{currentAthlete.currentProgram}</p>
              </div>
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-2 mb-2">
                  <Utensils className="w-4 h-4 text-success" />
                  <p className="text-sm text-muted-foreground">Beslenme Planı</p>
                </div>
                <p className="text-lg font-bold text-foreground">{currentAthlete.currentDiet}</p>
              </div>
            </div>
          </div>

          {/* Latest Check-in Data */}
          <div className="glass rounded-xl border border-border p-5 mb-6">
            <h3 className="font-semibold text-foreground mb-4">Son Check-in</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-secondary/50">
                <Brain className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold font-mono text-foreground">{checkIn?.mood || "-"}</p>
                <p className="text-xs text-muted-foreground">Ruh Hali</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/50">
                <Moon className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold font-mono text-foreground">{checkIn?.sleep || "-"}</p>
                <p className="text-xs text-muted-foreground">Uyku Kalitesi</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/50">
                <Activity className="w-5 h-5 text-warning mx-auto mb-2" />
                <p className="text-2xl font-bold font-mono text-foreground">{checkIn?.soreness || "-"}</p>
                <p className="text-xs text-muted-foreground">Ağrı</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/50">
                <Zap className="w-5 h-5 text-destructive mx-auto mb-2" />
                <p className="text-2xl font-bold font-mono text-foreground">{checkIn?.stress || "-"}</p>
                <p className="text-xs text-muted-foreground">Stres</p>
              </div>
            </div>
            {checkIn?.notes && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Notlar:</span> "{checkIn.notes}"
                </p>
              </div>
            )}
          </div>

          {/* Current Nutrition */}
          <div className="glass rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-4">Mevcut Beslenme Planı</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground mb-1">Günlük Kalori</p>
                <p className="text-3xl font-bold font-mono text-primary">{currentAthlete.currentCalories}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground mb-1">Protein Hedefi</p>
                <p className="text-3xl font-bold font-mono text-foreground">{currentAthlete.currentProtein}g</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Coach Actions */}
        <div className="w-96 p-6 flex flex-col bg-card/50">
          <h3 className="font-semibold text-foreground mb-6">Hızlı İşlemler</h3>

          {/* Risk-Based Slider: Injury Risk */}
          {isInjuryRisk && (
            <div className="space-y-4 mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <label className="text-sm font-medium text-destructive">Antrenman Yoğunluğunu Düşür</label>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[intensityReduction]}
                  onValueChange={([v]) => setIntensityReduction(v)}
                  min={10}
                  max={50}
                  step={5}
                  className="flex-1"
                />
                <span className="font-mono text-lg font-bold text-destructive min-w-[60px] text-right">
                  -%{intensityReduction}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Sakatlanma riski nedeniyle yoğunluğu %{intensityReduction} azalt
              </p>
            </div>
          )}

          {/* Risk-Based Slider: Nutrition Risk */}
          {isNutritionRisk && !isInjuryRisk && (
            <div className="space-y-4 mb-6 p-4 rounded-xl bg-warning/10 border border-warning/30">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-warning" />
                <label className="text-sm font-medium text-warning">Kalori Düzenle</label>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[adjustedCalories ?? currentAthlete.currentCalories]}
                  onValueChange={([v]) => setAdjustedCalories(v)}
                  min={currentAthlete.currentCalories - 500}
                  max={currentAthlete.currentCalories + 500}
                  step={50}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={adjustedCalories ?? currentAthlete.currentCalories}
                  onChange={(e) => setAdjustedCalories(Number(e.target.value))}
                  className="w-24 font-mono text-center bg-card border-border"
                />
              </div>
              {adjustedCalories && adjustedCalories !== currentAthlete.currentCalories && (
                <p className="text-xs text-warning">
                  Değişiklik: {adjustedCalories > currentAthlete.currentCalories ? "+" : ""}
                  {adjustedCalories - currentAthlete.currentCalories} kcal
                </p>
              )}
            </div>
          )}

          {/* Default Calorie Adjustment (for non-risk cases) */}
          {!isInjuryRisk && !isNutritionRisk && (
            <div className="space-y-4 mb-6">
              <label className="text-sm font-medium text-foreground">Günlük Kalori Ayarla</label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[adjustedCalories ?? currentAthlete.currentCalories]}
                  onValueChange={([v]) => setAdjustedCalories(v)}
                  min={1200}
                  max={5000}
                  step={50}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={adjustedCalories ?? currentAthlete.currentCalories}
                  onChange={(e) => setAdjustedCalories(Number(e.target.value))}
                  className="w-24 font-mono text-center bg-card border-border"
                />
              </div>
              {adjustedCalories && adjustedCalories !== currentAthlete.currentCalories && (
                <p className="text-xs text-primary">
                  Değişiklik: {adjustedCalories > currentAthlete.currentCalories ? "+" : ""}
                  {adjustedCalories - currentAthlete.currentCalories} kcal
                </p>
              )}
            </div>
          )}

          {/* Coach Note */}
          <div className="space-y-2 mb-6 flex-1">
            <label className="text-sm font-medium text-foreground">Mesaj Gönder</label>
            <Textarea
              placeholder="Sporcuya hızlı not yazın..."
              value={coachNote}
              onChange={(e) => setCoachNote(e.target.value)}
              className="flex-1 min-h-[100px] bg-card border-border focus:border-primary resize-none"
            />
            <Button variant="outline" size="sm" className="w-full border-border hover:bg-secondary">
              <Mic className="w-4 h-4 mr-2" />
              Sesli Not Kaydet
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mt-auto">
            <Button
              onClick={handleApprove}
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-semibold glow-lime"
            >
              <Check className="w-5 h-5 mr-2" />
              Onayla & Sonraki
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className="border-border hover:bg-secondary"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Önceki
              </Button>
              <Button
                variant="outline"
                onClick={handleSkip}
                className="border-border hover:bg-secondary"
              >
                Atla
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full text-destructive hover:bg-destructive/10"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Takip İçin İşaretle
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Hints */}
      <div className="h-12 border-t border-border flex items-center justify-center gap-8 text-sm text-muted-foreground flex-shrink-0 bg-card/50">
        <span>
          <span className="font-mono text-foreground">{processedCount}</span> bu oturumda işlendi
        </span>
        <span>•</span>
        <span>
          <span className="font-mono text-warning">{athletes.length - currentIndex - 1}</span> kalan
        </span>
      </div>
    </div>
  );
}

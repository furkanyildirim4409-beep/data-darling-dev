import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Camera, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface BodyScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanComplete: () => void;
}

export function BodyScanDialog({ open, onOpenChange, onScanComplete }: BodyScanDialogProps) {
  const [frontPhoto, setFrontPhoto] = useState<File | null>(null);
  const [sidePhoto, setSidePhoto] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [sidePreview, setSidePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  const frontInputRef = useRef<HTMLInputElement>(null);
  const sideInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "front" | "side"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === "front") {
          setFrontPhoto(file);
          setFrontPreview(reader.result as string);
        } else {
          setSidePhoto(file);
          setSidePreview(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartScan = () => {
    setIsScanning(true);
    // Simulate AI processing
    setTimeout(() => {
      setIsScanning(false);
      onScanComplete();
      onOpenChange(false);
      // Reset state
      setFrontPhoto(null);
      setSidePhoto(null);
      setFrontPreview(null);
      setSidePreview(null);
    }, 3500);
  };

  const canStartScan = frontPhoto && sidePhoto;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            AI Vücut Taraması
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {isScanning ? (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative h-80 flex flex-col items-center justify-center"
            >
              {/* Scanning Animation */}
              <div className="relative w-48 h-64">
                {/* Body Silhouette */}
                <svg
                  viewBox="0 0 100 180"
                  className="h-full w-full opacity-40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <ellipse cx="50" cy="18" rx="12" ry="14" className="fill-primary/30 stroke-primary" strokeWidth="0.5" />
                  <rect x="45" y="30" width="10" height="8" className="fill-primary/20" />
                  <path d="M30 38 L70 38 L75 90 L68 95 L32 95 L25 90 Z" className="fill-primary/25 stroke-primary" strokeWidth="0.5" />
                  <path d="M30 40 L20 45 L15 70 L10 95 L18 96 L25 72 L28 55" className="fill-primary/20" />
                  <path d="M70 40 L80 45 L85 70 L90 95 L82 96 L75 72 L72 55" className="fill-primary/20" />
                  <path d="M35 95 L32 130 L30 165 L40 165 L42 130 L45 100" className="fill-primary/20" />
                  <path d="M65 95 L68 130 L70 165 L60 165 L58 130 L55 100" className="fill-primary/20" />
                </svg>

                {/* Scanning Line */}
                <motion.div
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_hsl(var(--primary))]"
                  initial={{ top: 0 }}
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />

                {/* Grid Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute left-0 right-0 h-px bg-primary/20"
                      style={{ top: `${(i + 1) * 8}%` }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.2, 0.5, 0.2] }}
                      transition={{
                        duration: 1,
                        delay: i * 0.1,
                        repeat: Infinity,
                      }}
                    />
                  ))}
                </div>

                {/* Corner Markers */}
                <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-primary" />
                <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-primary" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-primary" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-primary" />
              </div>

              <div className="mt-6 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-primary">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-mono text-sm">AI Tarama Yapılıyor...</span>
                </div>
                <motion.div
                  className="text-xs text-muted-foreground font-mono"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Vücut kompozisyonu analiz ediliyor
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 py-4"
            >
              <p className="text-sm text-muted-foreground">
                AI vücut taraması için önden ve yandan fotoğraf yükleyin. Fotoğraflar gizli tutulur ve yalnızca analiz için kullanılır.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* Front Photo */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Önden Fotoğraf
                  </label>
                  <input
                    ref={frontInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, "front")}
                  />
                  <div
                    onClick={() => frontInputRef.current?.click()}
                    className={cn(
                      "relative aspect-[3/4] rounded-lg border-2 border-dashed cursor-pointer transition-all",
                      frontPreview
                        ? "border-primary/50 bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-primary/5"
                    )}
                  >
                    {frontPreview ? (
                      <>
                        <img
                          src={frontPreview}
                          alt="Front"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-success flex items-center justify-center">
                          <Check className="w-4 h-4 text-success-foreground" />
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Upload className="w-8 h-8" />
                        <span className="text-xs">Yükle</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Side Photo */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Yandan Fotoğraf
                  </label>
                  <input
                    ref={sideInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, "side")}
                  />
                  <div
                    onClick={() => sideInputRef.current?.click()}
                    className={cn(
                      "relative aspect-[3/4] rounded-lg border-2 border-dashed cursor-pointer transition-all",
                      sidePreview
                        ? "border-primary/50 bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-primary/5"
                    )}
                  >
                    {sidePreview ? (
                      <>
                        <img
                          src={sidePreview}
                          alt="Side"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-success flex items-center justify-center">
                          <Check className="w-4 h-4 text-success-foreground" />
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Upload className="w-8 h-8" />
                        <span className="text-xs">Yükle</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleStartScan}
                disabled={!canStartScan}
                className="w-full h-12 text-base font-semibold"
              >
                {canStartScan ? (
                  <>
                    <Camera className="w-5 h-5 mr-2" />
                    Taramayı Başlat
                  </>
                ) : (
                  "Her iki fotoğrafı da yükleyin"
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useRef } from "react";
import { Image as ImageIcon, Loader2, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useCreateHighlightGroup } from "@/hooks/useSocialMutations";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_TITLE = 24;

export function CreateHighlightGroupDialog({ open, onOpenChange }: Props) {
  const [title, setTitle] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const create = useCreateHighlightGroup();
  const isBusy = create.isPending;

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Lütfen bir görsel dosyası seçin.");
      return;
    }
    setCoverFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const reset = () => {
    setTitle("");
    setCoverFile(null);
    setPreviewUrl(null);
    setIsDragging(false);
  };

  const close = () => {
    if (isBusy) return;
    reset();
    onOpenChange(false);
  };

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Grup adı zorunludur.");
      return;
    }
    if (!coverFile) {
      toast.error("Kapak görseli zorunludur.");
      return;
    }
    try {
      await create.mutateAsync({ name: trimmed, coverFile });
      reset();
      onOpenChange(false);
    } catch {
      // error toast handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Yeni Öne Çıkan Grup
          </DialogTitle>
          <DialogDescription>
            Bir başlık ve kapak görseli belirleyin. Hikayeleri sonradan ekleyebilirsiniz.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="hl-title">Başlık</Label>
            <Input
              id="hl-title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
              placeholder="Örn. Değişimler"
              disabled={isBusy}
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground text-right">
              {title.length}/{MAX_TITLE}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Kapak Görseli
            </Label>

            {!previewUrl ? (
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer",
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-muted/30",
                )}
                onClick={() => fileInputRef.current?.click()}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Görsel sürükle veya seç</p>
                  <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, WEBP</p>
                </div>
              </div>
            ) : (
              <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-2 border-primary/40 ring-2 ring-offset-2 ring-offset-background ring-primary/20">
                <img src={previewUrl} alt="Cover preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setCoverFile(null);
                    setPreviewUrl(null);
                  }}
                  disabled={isBusy}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  aria-label="Kapağı kaldır"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={isBusy}>
            İptal
          </Button>
          <Button
            onClick={submit}
            disabled={isBusy || !title.trim() || !coverFile}
            className="bg-primary text-primary-foreground"
          >
            {isBusy ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Oluşturuluyor...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1.5" />
                Grubu Oluştur
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

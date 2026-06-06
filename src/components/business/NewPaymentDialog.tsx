import { useState } from "react";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Receipt } from "lucide-react";

const paymentSchema = z.object({
  athlete_id: z.string().uuid("Sporcu seçimi zorunlu"),
  title: z
    .string()
    .trim()
    .min(3, "Başlık en az 3 karakter olmalı")
    .max(120, "Başlık en fazla 120 karakter olabilir"),
  amount: z
    .number()
    .positive("Tutar sıfırdan büyük olmalı")
    .max(1000000, "Maksimum tutar aşıldı"),
  description: z
    .string()
    .trim()
    .max(1000, "Açıklama en fazla 1000 karakter olabilir")
    .optional(),
});

interface NewPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athletes: { id: string; full_name: string | null }[];
  onSubmit: (data: {
    athlete_id: string;
    title: string;
    amount: number;
    description?: string;
  }) => Promise<boolean | undefined>;
}

export function NewPaymentDialog({
  open,
  onOpenChange,
  athletes,
  onSubmit,
}: NewPaymentDialogProps) {
  const [athleteId, setAthleteId] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setAthleteId("");
    setTitle("");
    setAmount("");
    setDescription("");
    setErrors({});
  };

  const handleSubmit = async () => {
    const parsed = paymentSchema.safeParse({
      athlete_id: athleteId,
      title,
      amount: parseFloat(amount) || 0,
      description: description || undefined,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach((e) => {
        fieldErrors[e.path[0] as string] = e.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    const success = await onSubmit({
      athlete_id: parsed.data.athlete_id,
      title: parsed.data.title,
      amount: parsed.data.amount,
      description: parsed.data.description,
    });

    setSubmitting(false);

    if (success) {
      onOpenChange(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
      reset();
    }
  };

  const isValid =
    athleteId && title.trim().length >= 3 && amount && parseFloat(amount) > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card/80 backdrop-blur-xl border-border/60 sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <DialogTitle>Yeni Ek Hizmet Faturası</DialogTitle>
                <DialogDescription>
                  Sporcunuza özel bir ödeme isteği gönderin.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Athlete */}
            <div className="grid gap-2">
              <Label>Sporcu</Label>
              <Select value={athleteId} onValueChange={setAthleteId}>
                <SelectTrigger className="bg-background/50 border-border">
                  <SelectValue placeholder="Sporcu seçin..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border max-h-64">
                  {athletes.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground">
                      Aktif sporcu bulunamadı
                    </div>
                  ) : (
                    athletes.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.full_name || "İsimsiz"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.athlete_id && (
                <p className="text-xs text-destructive">{errors.athlete_id}</p>
              )}
            </div>

            {/* Title */}
            <div className="grid gap-2">
              <Label>Ödeme Başlığı</Label>
              <Input
                placeholder="24 Haftalık Yarışma Hazırlık Ek Paketi"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-background/50 border-border"
                maxLength={120}
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title}</p>
              )}
            </div>

            {/* Amount */}
            <div className="grid gap-2">
              <Label>Tutar (₺)</Label>
              <Input
                type="number"
                placeholder="2500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-background/50 border-border"
                min={1}
                max={1000000}
                step={50}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount}</p>
              )}
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label>Açıklama (opsiyonel)</Label>
              <Textarea
                placeholder="Paket kapsamı, süresi ve dahil olan hizmetler..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-background/50 border-border resize-none"
                maxLength={1000}
                rows={4}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {submitting ? "Gönderiliyor..." : "Faturayı Gönder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="flex flex-col items-center gap-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                  delay: 0.2,
                }}
                className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center"
              >
                <Check className="w-12 h-12 text-white" strokeWidth={3} />
              </motion.div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  Fatura İletildi
                </h2>
                <p className="text-muted-foreground">
                  Sporcunuz bildirim aldı ve ödeme yapabilir
                </p>
              </div>
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 2.5, ease: "linear" }}
                className="h-1 bg-emerald-500 rounded-full w-48"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Check } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const paymentSchema = z.object({
  athlete_id: z.string().min(1, "Sporcu seçimi zorunlu"),
  amount: z.number().positive("Tutar sıfırdan büyük olmalı").max(1000000, "Maksimum tutar aşıldı"),
  description: z.string().max(500, "Açıklama çok uzun").optional(),
  status: z.enum(["paid", "pending", "overdue"]),
  payment_date: z.string().min(1),
});

interface NewPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athletes: { id: string; full_name: string | null }[];
  onSubmit: (data: {
    athlete_id: string;
    amount: number;
    description?: string;
    status?: string;
    payment_date?: string;
  }) => Promise<boolean | undefined>;
}

export function NewPaymentDialog({ open, onOpenChange, athletes, onSubmit }: NewPaymentDialogProps) {
  const [athleteId, setAthleteId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("paid");
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    const parsed = paymentSchema.safeParse({
      athlete_id: athleteId,
      amount: parseFloat(amount) || 0,
      description: description || undefined,
      status,
      payment_date: paymentDate.toISOString(),
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
      amount: parsed.data.amount,
      description: parsed.data.description,
      status: parsed.data.status,
      payment_date: parsed.data.payment_date,
    });

    setSubmitting(false);

    if (success) {
      onOpenChange(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
      // Reset
      setAthleteId("");
      setAmount("");
      setDescription("");
      setStatus("paid");
      setPaymentDate(new Date());
    }
  };

  const isValid = athleteId && amount && parseFloat(amount) > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Yeni Ödeme Kaydı</DialogTitle>
            <DialogDescription>
              Sporcu için ödeme kaydı oluşturun.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Athlete Select */}
            <div className="grid gap-2">
              <Label>Sporcu</Label>
              <Select value={athleteId} onValueChange={setAthleteId}>
                <SelectTrigger className="bg-background/50 border-border">
                  <SelectValue placeholder="Sporcu seçin..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {athletes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.full_name || "İsimsiz"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.athlete_id && <p className="text-xs text-destructive">{errors.athlete_id}</p>}
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
                min={0}
                max={1000000}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label>Durum</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-background/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="paid">Ödendi</SelectItem>
                  <SelectItem value="pending">Bekliyor</SelectItem>
                  <SelectItem value="overdue">Gecikmiş</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Date */}
            <div className="grid gap-2">
              <Label>Ödeme Tarihi</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start text-left font-normal bg-background/50 border-border"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(paymentDate, "PPP", { locale: tr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                  <Calendar
                    mode="single"
                    selected={paymentDate}
                    onSelect={(date) => {
                      if (date) setPaymentDate(date);
                      setCalendarOpen(false);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label>Açıklama (opsiyonel)</Label>
              <Textarea
                placeholder="Personal Training - Ocak ayı"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-background/50 border-border resize-none"
                maxLength={500}
                rows={2}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className="bg-primary text-primary-foreground"
            >
              {submitting ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success overlay */}
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
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.2 }}
                className="w-24 h-24 rounded-full bg-success flex items-center justify-center"
              >
                <Check className="w-12 h-12 text-success-foreground" strokeWidth={3} />
              </motion.div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-1">Ödeme Kaydedildi</h2>
                <p className="text-muted-foreground">Ödeme başarıyla oluşturuldu</p>
              </div>
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 2.5, ease: "linear" }}
                className="h-1 bg-success rounded-full w-48"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

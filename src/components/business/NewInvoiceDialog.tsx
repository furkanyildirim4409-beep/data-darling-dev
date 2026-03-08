import { useState } from "react";
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

const clients = [
  { id: "1", name: "Ahmet Yılmaz" },
  { id: "2", name: "Zeynep Kaya" },
  { id: "3", name: "Mehmet Demir" },
  { id: "4", name: "Elif Öztürk" },
  { id: "5", name: "Can Arslan" },
  { id: "6", name: "Ayşe Yıldız" },
  { id: "7", name: "Burak Şahin" },
];

const serviceTypes = [
  { value: "pt", label: "Personal Training" },
  { value: "nutrition", label: "Beslenme Danışmanlığı" },
  { value: "group", label: "Grup Antrenmanı" },
  { value: "online", label: "Online Koçluk" },
  { value: "package", label: "Paket Program" },
];

interface NewInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvoiceCreated: (invoice: {
    client: string;
    amount: number;
    dueDate: Date;
    serviceType: string;
  }) => void;
}

export function NewInvoiceDialog({ open, onOpenChange, onInvoiceCreated }: NewInvoiceDialogProps) {
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [serviceType, setServiceType] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleSubmit = () => {
    if (!clientId || !amount || !dueDate || !serviceType) return;

    const client = clients.find((c) => c.id === clientId);
    
    onInvoiceCreated({
      client: client?.name || "",
      amount: parseFloat(amount),
      dueDate,
      serviceType,
    });

    // Close dialog and show success animation
    onOpenChange(false);
    setShowSuccess(true);

    // Hide success after 3 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);

    // Reset form
    setClientId("");
    setAmount("");
    setDueDate(undefined);
    setServiceType("");
  };

  const isValid = clientId && amount && dueDate && serviceType;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Yeni Fatura Oluştur</DialogTitle>
            <DialogDescription>
              Müşteri için yeni bir fatura talebi oluşturun.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Client Select */}
            <div className="grid gap-2">
              <Label htmlFor="client">Müşteri Seç</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="bg-background/50 border-border">
                  <SelectValue placeholder="Müşteri seçin..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="grid gap-2">
              <Label htmlFor="amount">Tutar (₺)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="2500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-background/50 border-border"
              />
            </div>

            {/* Due Date */}
            <div className="grid gap-2">
              <Label>Vade Tarihi</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal bg-background/50 border-border",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP", { locale: tr }) : "Tarih seçin..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => {
                      setDueDate(date);
                      setCalendarOpen(false);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Service Type */}
            <div className="grid gap-2">
              <Label htmlFor="service">Hizmet Tipi</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger className="bg-background/50 border-border">
                  <SelectValue placeholder="Hizmet seçin..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {serviceTypes.map((service) => (
                    <SelectItem key={service.value} value={service.value}>
                      {service.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid}
              className="bg-primary text-primary-foreground"
            >
              Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Screen Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 25,
                delay: 0.1 
              }}
              className="flex flex-col items-center gap-6"
            >
              {/* Animated Checkmark Circle */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 15,
                  delay: 0.2 
                }}
                className="w-32 h-32 rounded-full bg-success/20 flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 15,
                    delay: 0.3 
                  }}
                  className="w-24 h-24 rounded-full bg-success flex items-center justify-center"
                >
                  <motion.div
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, delay: 0.5 }}
                  >
                    <Check className="w-12 h-12 text-success-foreground" strokeWidth={3} />
                  </motion.div>
                </motion.div>
              </motion.div>

              {/* Success Text */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center"
              >
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  Talep Gönderildi
                </h2>
                <p className="text-muted-foreground">
                  Fatura talebi başarıyla oluşturuldu
                </p>
              </motion.div>

              {/* Progress bar for countdown */}
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 3, ease: "linear" }}
                className="h-1 bg-success rounded-full w-48"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

import { useState } from "react";
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
import { CalendarIcon, User, Mail, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAddTeamMember } from "@/hooks/useTeam";
import { useToast } from "@/hooks/use-toast";

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roles = [
  "Baş Antrenör",
  "Yardımcı Antrenör", 
  "Diyetisyen",
  "Fizyoterapist",
  "Sporcu Koordinatörü",
  "İdari Personel",
];

const permissionLevels = [
  { value: "full", label: "Tam Erişim" },
  { value: "limited", label: "Sınırlı Erişim" },
  { value: "read-only", label: "Salt Okunur" },
];

export function AddMemberDialog({ open, onOpenChange }: AddMemberDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [permissions, setPermissions] = useState<"full" | "limited" | "read-only">("limited");
  const [startDate, setStartDate] = useState<Date>();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const addMember = useAddTeamMember();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!name || !email || !role || !startDate) return;

    try {
      await addMember.mutateAsync({
        full_name: name,
        email,
        role,
        permissions,
        start_date: format(startDate, "yyyy-MM-dd"),
      });

      toast({
        title: "Üye Eklendi",
        description: `${name} takıma başarıyla eklendi.`,
      });

      onOpenChange(false);

      // Reset form
      setName("");
      setEmail("");
      setRole("");
      setPermissions("limited");
      setStartDate(undefined);
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Üye eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const isValid = name && email && role && startDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Yeni Takım Üyesi
          </DialogTitle>
          <DialogDescription>
            Takıma yeni bir üye ekleyin. Tüm alanları doldurun.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="member-name">Ad Soyad</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="member-name"
                placeholder="Örn: Ali Yılmaz"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>
          </div>

          {/* Email */}
          <div className="grid gap-2">
            <Label htmlFor="member-email">E-posta</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="member-email"
                type="email"
                placeholder="ali@dynabolic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>
          </div>

          {/* Role */}
          <div className="grid gap-2">
            <Label htmlFor="member-role">Rol</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="bg-background/50">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder="Rol seçin..." />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Permission Level */}
          <div className="grid gap-2">
            <Label htmlFor="member-permissions">Yetki Seviyesi</Label>
            <Select 
              value={permissions} 
              onValueChange={(v: "full" | "limited" | "read-only") => setPermissions(v)}
            >
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {permissionLevels.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="grid gap-2">
            <Label>Başlangıç Tarihi</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal bg-background/50",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP", { locale: tr }) : "Tarih seçin..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date);
                    setCalendarOpen(false);
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || addMember.isPending}
            className="bg-primary text-primary-foreground"
          >
            {addMember.isPending ? "Ekleniyor..." : "Üye Ekle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

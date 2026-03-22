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
import { User, Mail, Briefcase, Lock, Shield } from "lucide-react";
import { useCreateSubCoach } from "@/hooks/useCreateSubCoach";
import { usePermissionTemplates } from "@/hooks/usePermissionTemplates";
import { useToast } from "@/hooks/use-toast";
import { PermissionMatrix } from "@/components/team/PermissionMatrix";
import { getDefaultPermissions, type GranularPermissions } from "@/types/permissions";

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

const CUSTOM_KEY = "__custom__";

export function AddMemberDialog({ open, onOpenChange }: AddMemberDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [customPermissions, setCustomPermissions] = useState<GranularPermissions>(
    getDefaultPermissions("read-only")
  );

  const createSubCoach = useCreateSubCoach();
  const { templates } = usePermissionTemplates();
  const { toast } = useToast();

  const isCustom = selectedTemplateId === CUSTOM_KEY;

  const resolvePermissions = (): GranularPermissions => {
    if (isCustom) return customPermissions;
    const tpl = templates?.find((t) => t.id === selectedTemplateId);
    if (tpl) return tpl.permissions as GranularPermissions;
    return getDefaultPermissions("limited");
  };

  const handleTemplateChange = (value: string) => {
    setSelectedTemplateId(value);
    if (value !== CUSTOM_KEY) {
      const tpl = templates?.find((t) => t.id === value);
      if (tpl) setCustomPermissions(tpl.permissions as GranularPermissions);
    }
  };

  const handleSubmit = async () => {
    if (!name || !email || !role || !password || password.length < 6 || !selectedTemplateId) return;

    try {
      await createSubCoach.mutateAsync({
        fullName: name,
        email,
        password,
        role,
        permissions: "limited",
        custom_permissions: resolvePermissions(),
      });

      toast({
        title: "Hesap Oluşturuldu",
        description: "Hesap başarıyla oluşturuldu. E-posta ve şifreyi asistanınızla paylaşın.",
      });

      onOpenChange(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("");
      setSelectedTemplateId("");
      setCustomPermissions(getDefaultPermissions("read-only"));
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Hesap oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const isValid = name && email && role && password && password.length >= 6 && selectedTemplateId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Yeni Hesap Oluştur
          </DialogTitle>
          <DialogDescription>
            Takıma yeni bir asistan hesabı oluşturun. Tüm alanları doldurun.
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

          {/* Password */}
          <div className="grid gap-2">
            <Label htmlFor="member-password">Geçici Şifre</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="member-password"
                type="password"
                placeholder="Min. 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 bg-background/50"
                minLength={6}
              />
            </div>
            {password && password.length < 6 && (
              <p className="text-xs text-destructive">Şifre en az 6 karakter olmalıdır.</p>
            )}
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

          {/* Permission Template */}
          <div className="grid gap-2">
            <Label>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Yetki Şablonu
              </div>
            </Label>
            <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Şablon seçin..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {templates?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_KEY}>Özel Yetki</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Permission Matrix */}
          {isCustom && (
            <div className="pt-2">
              <PermissionMatrix value={customPermissions} onChange={setCustomPermissions} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || createSubCoach.isPending}
            className="bg-primary text-primary-foreground"
          >
            {createSubCoach.isPending ? "Oluşturuluyor..." : "Hesap Oluştur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

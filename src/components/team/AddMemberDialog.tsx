import { useState, useEffect, useCallback } from "react";
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
import { User, Mail, Briefcase, Lock, Shield, AtSign, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useCreateSubCoach } from "@/hooks/useCreateSubCoach";
import { usePermissionTemplates } from "@/hooks/usePermissionTemplates";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
  const [subUsername, setSubUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [customPermissions, setCustomPermissions] = useState<GranularPermissions>(
    getDefaultPermissions("read-only")
  );

  const createSubCoach = useCreateSubCoach();
  const { data: templates } = usePermissionTemplates();
  const { toast } = useToast();
  const { profile } = useAuth();

  const coachUsername = profile?.username || "";

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

  const handleSubUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (val.length <= 20) setSubUsername(val);
  };

  // Debounced uniqueness check for the full username
  const checkUsername = useCallback((fullUsername: string) => {
    if (!fullUsername || !coachUsername || subUsername.length < 2) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', fullUsername)
        .maybeSingle();
      setUsernameStatus(data ? 'taken' : 'available');
    }, 500);
    return () => clearTimeout(timeout);
  }, [coachUsername, subUsername.length]);

  useEffect(() => {
    if (!coachUsername || subUsername.length < 2) {
      setUsernameStatus('idle');
      return;
    }
    const fullUsername = `${coachUsername}.${subUsername}`;
    const cleanup = checkUsername(fullUsername);
    return cleanup;
  }, [subUsername, coachUsername, checkUsername]);

  const handleSubmit = async () => {
    if (!name || !email || !role || !password || password.length < 6 || !selectedTemplateId) return;

    const finalUsername = coachUsername && subUsername.length >= 2
      ? `${coachUsername}.${subUsername}`
      : undefined;

    if (coachUsername && subUsername.length >= 2 && usernameStatus !== 'available') {
      toast({
        title: "Hata",
        description: "Lütfen geçerli ve benzersiz bir kullanıcı adı seçin.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createSubCoach.mutateAsync({
        fullName: name,
        email,
        password,
        role,
        permissions: "limited",
        custom_permissions: resolvePermissions(),
        username: finalUsername,
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
      setSubUsername("");
      setUsernameStatus('idle');
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
                placeholder="ali@email.com"
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

          {/* Agency Username */}
          {coachUsername && (
            <div className="grid gap-2">
              <Label htmlFor="sub-username">
                <div className="flex items-center gap-2">
                  <AtSign className="w-4 h-4 text-primary" />
                  Dynabolic Kullanıcı Adı
                </div>
              </Label>
              <div className="flex items-center gap-0">
                <span className="inline-flex items-center h-10 px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground whitespace-nowrap">
                  {coachUsername}.
                </span>
                <div className="relative flex-1">
                  <Input
                    id="sub-username"
                    placeholder="ali"
                    value={subUsername}
                    onChange={handleSubUsernameChange}
                    className="rounded-l-none bg-background/50 pr-9"
                    maxLength={20}
                    minLength={2}
                  />
                  {usernameStatus === 'checking' && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                  )}
                  {usernameStatus === 'available' && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                  {usernameStatus === 'taken' && (
                    <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
                  )}
                </div>
              </div>
              {subUsername.length > 0 && subUsername.length < 2 && (
                <p className="text-xs text-muted-foreground">En az 2 karakter gerekli</p>
              )}
              {usernameStatus === 'taken' && (
                <p className="text-xs text-destructive">Bu kullanıcı adı zaten alınmış</p>
              )}
              {usernameStatus === 'available' && (
                <p className="text-xs text-green-500">
                  E-posta: <span className="font-medium">{coachUsername}.{subUsername}@dynabolic.co</span>
                </p>
              )}
            </div>
          )}

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

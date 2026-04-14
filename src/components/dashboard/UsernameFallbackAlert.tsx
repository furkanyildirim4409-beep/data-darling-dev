import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, Mail, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export function UsernameFallbackAlert() {
  const { profile, user, isSubCoach, refreshProfile } = useAuth();
  const [username, setUsername] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isValid = /^[a-z0-9]+$/.test(username) && username.length >= 3 && username.length <= 20;

  const checkAvailability = useCallback(async (value: string) => {
    if (!/^[a-z0-9]+$/.test(value) || value.length < 3) {
      setIsAvailable(null);
      return;
    }
    setIsChecking(true);
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", value)
      .maybeSingle();
    setIsAvailable(!data);
    setIsChecking(false);
  }, []);

  useEffect(() => {
    if (!isValid) { setIsAvailable(null); return; }
    const t = setTimeout(() => checkAvailability(username), 400);
    return () => clearTimeout(t);
  }, [username, isValid, checkAvailability]);

  if (!profile || profile.role !== "coach" || profile.username) return null;

  if (isSubCoach) {
    return (
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Sistem yöneticiniz henüz size bir <span className="font-semibold text-foreground">@dynabolic.co</span> e-posta adresi atamamış. Lütfen Baş Antrenörünüz ile iletişime geçin.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSave = async () => {
    if (!isValid || !isAvailable || !user) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username } as any)
      .eq("id", user.id);
    setIsSaving(false);
    if (error) {
      if (error.code === "23505") {
        toast.error("Bu kullanıcı adı zaten alınmış. Lütfen başka bir tane deneyin.");
        setIsAvailable(false);
      } else {
        toast.error("Bir hata oluştu: " + error.message);
      }
      return;
    }
    toast.success("Kullanıcı adınız başarıyla kaydedildi!");
    await refreshProfile();
  };

  return (
    <Card className="border-warning/40 bg-warning/5">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <CardTitle className="text-lg">Kurumsal E-Posta Adresinizi Belirleyin</CardTitle>
        </div>
        <CardDescription>
          Sistemi tam kapasite kullanabilmek ve size özel <span className="font-semibold text-foreground">@dynabolic.co</span> mail adresinizi aktifleştirmek için lütfen bir kullanıcı adı belirleyin.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
        <div className="flex-1 w-full space-y-1.5">
          <div className="flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
              placeholder="kullaniciadi"
              className="border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
              maxLength={20}
            />
            <span className="text-muted-foreground text-sm whitespace-nowrap">@dynabolic.co</span>
          </div>
          <div className="h-5 text-xs">
            {isChecking && <span className="text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Kontrol ediliyor...</span>}
            {!isChecking && isAvailable === true && <span className="text-success flex items-center gap-1"><Check className="h-3 w-3" /> Kullanılabilir</span>}
            {!isChecking && isAvailable === false && <span className="text-destructive">Bu kullanıcı adı zaten alınmış</span>}
            {!isChecking && isAvailable === null && username.length > 0 && username.length < 3 && <span className="text-muted-foreground">En az 3 karakter gerekli</span>}
          </div>
        </div>
        <Button onClick={handleSave} disabled={!isValid || !isAvailable || isSaving} className="shrink-0">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
          Kaydet ve Aktifleştir
        </Button>
      </CardContent>
    </Card>
  );
}

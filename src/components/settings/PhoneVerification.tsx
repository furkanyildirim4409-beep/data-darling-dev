import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Phone, ShieldCheck, ShieldAlert, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";

type Phase = "loading" | "idle" | "sent" | "active";

export function PhoneVerification() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [currentPhone, setCurrentPhone] = useState<string | null>(null);
  const [phone, setPhone] = useState("+90");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const u = data?.user;
      if (u?.phone && u.phone_confirmed_at) {
        setCurrentPhone(u.phone.startsWith("+") ? u.phone : `+${u.phone}`);
        setPhase("active");
      } else {
        setPhase("idle");
      }
    } catch {
      setPhase("idle");
    }
  };

  useEffect(() => { refresh(); }, []);

  const normalize = (raw: string) => {
    const cleaned = raw.replace(/[^\d+]/g, "");
    if (!cleaned.startsWith("+")) return `+${cleaned.replace(/^0+/, "")}`;
    return cleaned;
  };

  const sendCode = async () => {
    const e164 = normalize(phone);
    if (e164.length < 10) {
      toast.error("Geçerli bir telefon numarası girin (örn: +905551234567).");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ phone: e164.replace(/^\+/, "") });
      if (error) throw error;
      setCurrentPhone(e164);
      setCode("");
      setPhase("sent");
      toast.success("Doğrulama kodu telefonunuza gönderildi.");
    } catch (e: any) {
      toast.error(e?.message || "SMS gönderilemedi. Provider yapılandırmasını kontrol edin.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!currentPhone || code.length !== 6) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: currentPhone.replace(/^\+/, ""),
        token: code,
        type: "phone_change",
      });
      if (error) throw error;
      toast.success("Telefon numaranız doğrulandı.");
      setCode("");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Kod hatalı veya süresi dolmuş.");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const removePhone = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ phone: "" });
      if (error) throw error;
      toast.success("Telefon numarası kaldırıldı.");
      setCurrentPhone(null);
      setPhone("+90");
      setPhase("idle");
    } catch (e: any) {
      toast.error(e?.message || "İşlem başarısız.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card/40 p-5 space-y-4">
      <div className="flex items-start gap-3">
        {phase === "active" ? (
          <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
        ) : (
          <ShieldAlert className="w-5 h-5 text-warning mt-0.5" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">SMS Doğrulama (Telefon)</p>
            {phase === "active" && (
              <Badge className="bg-primary/15 text-primary border-primary/30">Aktif</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Telefon numaranıza SMS ile gönderilen kod ile giriş yapın veya hesabınızı koruyun.
          </p>
        </div>
      </div>

      {phase === "loading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Durum kontrol ediliyor…
        </div>
      )}

      {phase === "idle" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Telefon Numarası
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                inputMode="tel"
                placeholder="+905551234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10 font-mono"
              />
            </div>
          </div>
          <Button onClick={sendCode} disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Doğrulama Kodu Gönder
          </Button>
        </div>
      )}

      {phase === "sent" && (
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            <span className="font-mono">{currentPhone}</span> numarasına 6 haneli kod gönderildi.
          </p>
          <InputOTP maxLength={6} value={code} onChange={(v) => setCode(v.replace(/\D/g, ""))}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
          <div className="flex gap-2">
            <Button onClick={verify} disabled={busy || code.length !== 6} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Doğrula
            </Button>
            <Button variant="ghost" onClick={sendCode} disabled={busy}>Tekrar Gönder</Button>
            <Button variant="ghost" onClick={() => setPhase("idle")} disabled={busy}>İptal</Button>
          </div>
        </div>
      )}

      {phase === "active" && (
        <div className="flex items-center gap-3 flex-wrap">
          <code className="text-sm font-mono bg-muted/60 px-2 py-1 rounded">{currentPhone}</code>
          <Button variant="destructive" onClick={removePhone} disabled={busy}>
            {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Kaldır
          </Button>
        </div>
      )}
    </div>
  );
}

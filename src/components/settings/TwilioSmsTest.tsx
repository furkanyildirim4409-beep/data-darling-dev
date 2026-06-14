import { useState } from "react";
import { toast } from "sonner";
import { Phone, FlaskConical, Send, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";

/**
 * Twilio + Supabase Auth Phone Provider sandbox test paneli.
 * Gerçekten SMS gönderilmeden başarı göstermez.
 */
export function TwilioSmsTest() {
  const [phone, setPhone] = useState("+90");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const normalize = (raw: string) => {
    const cleaned = raw.replace(/[^\d+]/g, "");
    return cleaned.startsWith("+") ? cleaned : `+${cleaned.replace(/^0+/, "")}`;
  };

  const translateError = (msg: string): string => {
    const m = (msg || "").toLowerCase();
    if (m.includes("20003") || (m.includes("authenticate") && m.includes("twilio")))
      return "Twilio kimlik doğrulama hatası (20003). Supabase Dashboard → Authentication → Providers → Phone → Twilio bölümündeki Account SID, Auth Token ve Messaging Service SID / From Number bilgilerini kontrol edin.";
    if (m.includes("sms_send_failed") || m.includes("error sending"))
      return "Twilio SMS gönderilemedi. Supabase Phone Provider ayarlarındaki Twilio bilgilerinin doğruluğunu ve Twilio bakiyenizi kontrol edin.";
    if (m.includes("unsupported phone provider") || m.includes("sms provider"))
      return "Supabase Auth'ta SMS Provider (Twilio) aktif değil. Dashboard → Authentication → Providers → Phone bölümünden Twilio'yu etkinleştirin.";
    if (m.includes("signups not allowed") || m.includes("otp_disabled"))
      return "Bu numara sisteme kayıtlı değil veya Phone OTP signup kapalı. Test için önce Ayarlar → SMS Doğrulama (Telefon) bölümünden bir numara doğrulayın, sonra burada test edin.";
    if (m.includes("invalid") && m.includes("phone"))
      return "Geçersiz telefon numarası formatı (E.164 bekleniyor, örn: +905551234567).";
    if (m.includes("rate") || m.includes("limit"))
      return "Çok fazla deneme. Lütfen biraz sonra tekrar deneyin.";
    if (m.includes("token") || m.includes("otp") || m.includes("expired"))
      return "Kod hatalı veya süresi dolmuş.";
    return msg;
  };

  const sendTest = async () => {
    const e164 = normalize(phone);
    if (e164.length < 10) {
      toast.error("Geçerli bir telefon numarası girin (örn: +905551234567).");
      return;
    }
    setBusy(true);
    setVerified(false);
    setLastError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: e164,
        options: { shouldCreateUser: false, channel: "sms" },
      });
      if (error) {
        const friendly = translateError(error.message);
        setLastError(friendly);
        toast.error(friendly);
      } else {
        setSent(true);
        setCode("");
        toast.success("Twilio üzerinden test SMS kodu gönderildi.");
      }
    } catch (e: any) {
      const friendly = translateError(e?.message || "Beklenmeyen hata.");
      setLastError(friendly);
      toast.error(friendly);
    } finally {
      setBusy(false);
    }
  };

  const verifyTest = async () => {
    if (code.length !== 6) return;
    setBusy(true);
    setLastError(null);
    try {
      const e164 = normalize(phone);
      const { error } = await supabase.auth.verifyOtp({
        phone: e164,
        token: code,
        type: "sms",
      });
      if (error) {
        const friendly = translateError(error.message);
        setLastError(friendly);
        toast.error(friendly);
      } else {
        setVerified(true);
        toast.success("Test başarılı: Twilio + Supabase entegrasyonu çalışıyor.");
        // Sandbox oturumunu hemen kapat — test paneli oturum açmamalı
        await supabase.auth.signOut();
      }
    } catch (e: any) {
      const friendly = translateError(e?.message || "Doğrulama başarısız.");
      setLastError(friendly);
      toast.error(friendly);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setSent(false);
    setCode("");
    setVerified(false);
    setLastError(null);
  };

  return (
    <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <FlaskConical className="w-5 h-5 text-primary mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-foreground">Twilio SMS Entegrasyon Testi</p>
            <Badge variant="outline" className="border-primary/40 text-primary">Sandbox</Badge>
            {verified && <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Çalışıyor</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            Bu panel sadece daha önce doğrulanmış bir numaraya gerçek SMS gönderir. Numara sistemde kayıtlı değilse Supabase güvenlik nedeniyle SMS göndermez.
          </p>
        </div>
      </div>

      {lastError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{lastError}</span>
        </div>
      )}

      {!sent ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Test Telefon Numarası (E.164)</label>
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
          <Button onClick={sendTest} disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Test Kodu Gönder
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            <span className="font-mono">{normalize(phone)}</span> numarasına test kodu gönderildi. Twilio'dan SMS gelmediyse Twilio konsolundan loglara bakın.
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
          <div className="flex gap-2 flex-wrap">
            <Button onClick={verifyTest} disabled={busy || code.length !== 6} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Kodu Doğrula
            </Button>
            <Button variant="ghost" onClick={sendTest} disabled={busy}>Yeniden Gönder</Button>
            <Button variant="ghost" onClick={reset} disabled={busy}>Sıfırla</Button>
          </div>
        </div>
      )}
    </div>
  );
}

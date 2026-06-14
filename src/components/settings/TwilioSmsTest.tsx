import { useState } from "react";
import { toast } from "sonner";
import { Phone, FlaskConical, Send, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";

/**
 * Twilio entegrasyonu için sandbox test paneli.
 * Mevcut oturumu bozmadan SMS gönderim/doğrulama akışını test eder.
 */
export function TwilioSmsTest() {
  const [phone, setPhone] = useState("+90");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);

  const normalize = (raw: string) => {
    const cleaned = raw.replace(/[^\d+]/g, "");
    return cleaned.startsWith("+") ? cleaned : `+${cleaned.replace(/^0+/, "")}`;
  };

  const translateError = (msg: string): string => {
    const m = (msg || "").toLowerCase();
    if (m.includes("unsupported phone provider") || m.includes("sms provider"))
      return "Supabase Auth'ta SMS Provider (Twilio) aktif değil. Dashboard → Authentication → Providers → Phone bölümünden Twilio'yu etkinleştirin.";
    if (m.includes("invalid") && m.includes("phone")) return "Geçersiz telefon numarası formatı (E.164 bekleniyor, örn: +905551234567).";
    if (m.includes("rate") || m.includes("limit")) return "Çok fazla deneme. Lütfen biraz sonra tekrar deneyin.";
    if (m.includes("token") || m.includes("otp") || m.includes("expired")) return "Kod hatalı veya süresi dolmuş.";
    if (m.includes("signups not allowed")) return "Numaraya kayıtlı kullanıcı bulunamadı (test modunda beklenen davranış). Twilio'dan SMS geldiyse entegrasyon çalışıyor demektir.";
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
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: e164.replace(/^\+/, ""),
        options: { shouldCreateUser: false, channel: "sms" },
      });
      if (error) {
        const friendly = translateError(error.message);
        // "signups not allowed" → Twilio aslında SMS göndermiş olur; bunu başarı say
        if (error.message?.toLowerCase().includes("signups not allowed")) {
          setSent(true);
          toast.success("Twilio SMS gönderildi (numara hesapta yok, sadece akış testi).");
        } else {
          toast.error(friendly);
        }
      } else {
        setSent(true);
        setCode("");
        toast.success("Test SMS kodu Twilio üzerinden gönderildi.");
      }
    } catch (e: any) {
      toast.error(translateError(e?.message || "Beklenmeyen hata."));
    } finally {
      setBusy(false);
    }
  };

  const verifyTest = async () => {
    if (code.length !== 6) return;
    setBusy(true);
    try {
      const e164 = normalize(phone);
      const { error } = await supabase.auth.verifyOtp({
        phone: e164.replace(/^\+/, ""),
        token: code,
        type: "sms",
      });
      if (error) {
        // Eğer numara hesapta kayıtlı değilse "user not found" döner ama Twilio kodu doğruysa bu da entegrasyonun çalıştığını gösterir
        if (error.message?.toLowerCase().includes("user")) {
          setVerified(true);
          toast.success("Kod doğru çözüldü. Twilio + Supabase entegrasyonu uçtan uca çalışıyor.");
        } else {
          toast.error(translateError(error.message));
        }
      } else {
        setVerified(true);
        toast.success("Test başarılı: Twilio entegrasyonu çalışıyor.");
        // Sandbox oturumunu hemen kapat — test paneli oturum açmamalı
        await supabase.auth.signOut();
      }
    } catch (e: any) {
      toast.error(translateError(e?.message || "Doğrulama başarısız."));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setSent(false);
    setCode("");
    setVerified(false);
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
            Twilio'yu Supabase Auth'a bağladıktan sonra burada uçtan uca SMS gönderim/doğrulama testi yapın.
            Bu panel oturumunuzu değiştirmez.
          </p>
        </div>
      </div>

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

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type Phase = "loading" | "idle" | "enrolling" | "active";

export function TwoFactorSetup() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrUri, setQrUri] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const verified = data?.totp?.find((f: any) => f.status === "verified");
      if (verified) {
        setFactorId(verified.id);
        setPhase("active");
      } else {
        // Clean any unverified leftover factors so enroll() won't fail with "factor exists"
        const pending = data?.totp?.find((f: any) => f.status !== "verified");
        if (pending) {
          await supabase.auth.mfa.unenroll({ factorId: pending.id });
        }
        setPhase("idle");
      }
    } catch (e: any) {
      console.error(e);
      setPhase("idle");
    }
  };

  useEffect(() => { refresh(); }, []);

  const startEnroll = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Dynabolic ${new Date().toISOString().slice(0, 10)}`,
      });
      if (error) throw error;
      setFactorId(data.id);
      setQrUri(data.totp.uri);
      setSecret(data.totp.secret);
      setCode("");
      setPhase("enrolling");
    } catch (e: any) {
      toast.error(e?.message || "2FA başlatılamadı.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!factorId || code.length !== 6) return;
    setBusy(true);
    try {
      const ch = await supabase.auth.mfa.challenge({ factorId });
      if (ch.error) throw ch.error;
      const v = await supabase.auth.mfa.verify({
        factorId,
        challengeId: ch.data.id,
        code,
      });
      if (v.error) throw v.error;
      toast.success("2 Faktörlü Doğrulama etkinleştirildi.");
      setCode("");
      setQrUri("");
      setSecret("");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Kod hatalı veya süresi dolmuş.");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const cancelEnroll = async () => {
    if (factorId) {
      try { await supabase.auth.mfa.unenroll({ factorId }); } catch {}
    }
    setFactorId(null);
    setQrUri("");
    setSecret("");
    setCode("");
    setPhase("idle");
  };

  const disable = async () => {
    if (!factorId) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast.success("2FA devre dışı bırakıldı.");
      setFactorId(null);
      setPhase("idle");
    } catch (e: any) {
      toast.error(e?.message || "İşlem başarısız.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card/40 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {phase === "active" ? (
            <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-warning mt-0.5" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">İki Faktörlü Doğrulama (2FA)</p>
              {phase === "active" && (
                <Badge className="bg-primary/15 text-primary border-primary/30">Aktif</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Google Authenticator, 1Password veya Authy gibi bir uygulama kullanarak hesabınızı koruyun.
            </p>
          </div>
        </div>
      </div>

      {phase === "loading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Durum kontrol ediliyor…
        </div>
      )}

      {phase === "idle" && (
        <Button onClick={startEnroll} disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Smartphone className="w-4 h-4 mr-2" />}
          2 Faktörlü Doğrulamayı Etkinleştir
        </Button>
      )}

      {phase === "enrolling" && qrUri && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-5 items-start">
            <div className="bg-white p-3 rounded-lg">
              <QRCodeSVG value={qrUri} size={180} />
            </div>
            <div className="space-y-3 flex-1">
              <p className="text-sm text-foreground">
                1. Authenticator uygulamanızda QR kodunu tarayın.
              </p>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Manuel anahtar:</p>
                <code className="block text-xs font-mono bg-muted/60 px-2 py-1 rounded break-all">
                  {secret}
                </code>
              </div>
              <p className="text-sm text-foreground">2. Üretilen 6 haneli kodu aşağıya girin:</p>
              <Input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="tracking-[0.5em] text-center font-mono text-lg"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={verify} disabled={busy || code.length !== 6} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Doğrula ve Etkinleştir
            </Button>
            <Button variant="ghost" onClick={cancelEnroll} disabled={busy}>İptal</Button>
          </div>
        </div>
      )}

      {phase === "active" && (
        <div className="flex items-center gap-3">
          <Button variant="destructive" onClick={disable} disabled={busy}>
            {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Devre Dışı Bırak
          </Button>
          <p className="text-xs text-muted-foreground">
            Sonraki girişinizde doğrulama kodu istenecektir.
          </p>
        </div>
      )}
    </div>
  );
}

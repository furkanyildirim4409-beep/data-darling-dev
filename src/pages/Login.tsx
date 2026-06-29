import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Lock, Zap, ShieldCheck, Phone, Send } from 'lucide-react';
import { toast } from 'sonner';

type Mode = 'password' | 'sms';

export default function Login() {
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingLogin, setPendingLogin] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);


  // TOTP MFA challenge
  const [showMfa, setShowMfa] = useState(false);
  const [factorId, setFactorId] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // SMS login
  const [phone, setPhone] = useState('+90');
  const [smsCode, setSmsCode] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [smsBusy, setSmsBusy] = useState(false);

  const { signIn, signOut, profile } = useAuth();
  const navigate = useNavigate();

  const normalizePhone = (raw: string) => {
    const cleaned = raw.replace(/[^\d+]/g, '');
    return cleaned.startsWith('+') ? cleaned : `+${cleaned.replace(/^0+/, '')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) { setLoading(false); return; }

    try {
      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError) throw aalError;

      if (aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2') {
        const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;
        const totpFactor = factorsData?.totp?.find((f: any) => f.status === 'verified');
        if (totpFactor) {
          setFactorId(totpFactor.id);
          setShowMfa(true);
          setLoading(false);
          return;
        }
      }
    } catch (err: any) {
      await supabase.auth.signOut();
      toast.error(err?.message || '2FA durumu kontrol edilemedi.');
      setLoading(false);
      return;
    }

    setPendingLogin(true);
    setLoading(false);
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length !== 6) return;
    setIsVerifying(true);
    try {
      const ch = await supabase.auth.mfa.challenge({ factorId });
      if (ch.error) throw ch.error;
      const v = await supabase.auth.mfa.verify({ factorId, challengeId: ch.data.id, code: mfaCode });
      if (v.error) throw v.error;
      toast.success('2 Adımlı Doğrulama başarılı!');
      setShowMfa(false);
      setMfaCode('');
      setPendingLogin(true);
    } catch (err: any) {
      toast.error('Doğrulama kodu hatalı veya süresi dolmuş.');
      setMfaCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancelMfa = async () => {
    await supabase.auth.signOut();
    setShowMfa(false);
    setFactorId('');
    setMfaCode('');
    setPassword('');
    setPendingLogin(false);
  };

  const translateSmsError = (msg: string): string => {
    const m = (msg || '').toLowerCase();
    if (m.includes('20003') || (m.includes('authenticate') && m.includes('twilio')))
      return 'Twilio kimlik doğrulama hatası (20003). Supabase Phone Provider → Twilio Account SID, Auth Token ve From Number bilgilerini kontrol edin.';
    if (m.includes('signups not allowed') || m.includes('otp_disabled'))
      return 'Bu numara sistemde kayıtlı değil. Önce e-posta ile giriş yapıp Ayarlar → Güvenlik bölümünden telefonunuzu doğrulayın.';
    if (m.includes('sms_send_failed') || m.includes('error sending'))
      return 'SMS gönderilemedi. Twilio yapılandırmasını kontrol edin.';
    if (m.includes('rate') || m.includes('limit'))
      return 'Çok fazla deneme. Lütfen biraz sonra tekrar deneyin.';
    if (m.includes('token') || m.includes('otp') || m.includes('expired'))
      return 'Kod hatalı veya süresi dolmuş.';
    return msg;
  };

  const sendSmsCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const e164 = normalizePhone(phone);
    if (e164.length < 10) { toast.error('Geçerli bir telefon numarası girin.'); return; }
    setSmsBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: e164,
        options: { shouldCreateUser: false, channel: 'sms' },
      });
      if (error) throw error;
      setSmsSent(true);
      setSmsCode('');
      toast.success('Doğrulama kodu telefonunuza gönderildi.');
    } catch (err: any) {
      toast.error(translateSmsError(err?.message || 'SMS gönderilemedi.'));
    } finally {
      setSmsBusy(false);
    }
  };

  const verifySmsCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (smsCode.length !== 6) return;
    setSmsBusy(true);
    try {
      const e164 = normalizePhone(phone);
      const { error } = await supabase.auth.verifyOtp({
        phone: e164,
        token: smsCode,
        type: 'sms',
      });
      if (error) throw error;
      toast.success('Telefon doğrulandı!');
      setPendingLogin(true);
    } catch (err: any) {
      toast.error(translateSmsError(err?.message || 'Kod hatalı veya süresi dolmuş.'));
      setSmsCode('');
    } finally {
      setSmsBusy(false);
    }
  };

  useEffect(() => {
    if (!pendingLogin || !profile) return;
    if (profile.role === 'coach') {
      navigate('/');
    } else {
      toast.error('Bu panel sadece Koçlar içindir!');
      signOut();
    }
    setPendingLogin(false);
  }, [pendingLogin, profile]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08)_0%,transparent_70%)]" />
      <div className="w-full max-w-sm space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-8 h-8 text-primary drop-shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
            <h1 className="text-4xl font-extrabold tracking-tighter text-primary drop-shadow-[0_0_20px_hsl(var(--primary)/0.4)]">DYNABOLIC</h1>
          </div>
          <p className="text-muted-foreground text-sm tracking-widest uppercase">Coach Operating System</p>
        </div>

        {showMfa ? (
          <form onSubmit={handleVerifyMfa} className="space-y-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-7 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/15 border border-primary/30">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Güvenlik Kodu</h2>
              <p className="text-sm text-muted-foreground">Authenticator uygulamanızdaki 6 haneli kodu girin.</p>
            </div>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={mfaCode} onChange={(val) => setMfaCode(val.replace(/\D/g, ''))} autoFocus>
                <InputOTPGroup>
                  <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                  <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button type="submit" disabled={isVerifying || mfaCode.length !== 6} className="w-full h-11 bg-primary text-black font-bold text-sm tracking-wide hover:shadow-glow-lime transition-shadow">
              {isVerifying ? 'Doğrulanıyor...' : 'Doğrula ve Giriş Yap'}
            </Button>
            <Button type="button" variant="ghost" onClick={handleCancelMfa} disabled={isVerifying} className="w-full">İptal</Button>
          </form>
        ) : (
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-7 shadow-2xl">
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="grid grid-cols-2 w-full mb-5 bg-black/60 border border-white/10">
                <TabsTrigger value="password" className="data-[state=active]:bg-primary data-[state=active]:text-black">
                  <Mail className="w-4 h-4 mr-2" /> E-posta
                </TabsTrigger>
                <TabsTrigger value="sms" className="data-[state=active]:bg-primary data-[state=active]:text-black">
                  <Phone className="w-4 h-4 mr-2" /> SMS
                </TabsTrigger>
              </TabsList>

              <TabsContent value="password" className="mt-0">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">E-posta</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input id="email" type="email" placeholder="coach@dynabolic.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="flex h-11 w-full rounded-lg border border-white/10 bg-black/50 pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Şifre</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="flex h-11 w-full rounded-lg border border-white/10 bg-black/50 pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors" />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-11 bg-primary text-black font-bold text-sm tracking-wide hover:shadow-glow-lime transition-shadow">
                    {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="sms" className="mt-0">
                {!smsSent ? (
                  <form onSubmit={sendSmsCode} className="space-y-5">
                    <div className="space-y-1.5">
                      <label htmlFor="phone" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Telefon Numarası</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input id="phone" inputMode="tel" placeholder="+905551234567" value={phone} onChange={(e) => setPhone(e.target.value)} required className="flex h-11 w-full rounded-lg border border-white/10 bg-black/50 pl-10 pr-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors" />
                      </div>
                    </div>
                    <Button type="submit" disabled={smsBusy} className="w-full h-11 bg-primary text-black font-bold text-sm tracking-wide hover:shadow-glow-lime transition-shadow">
                      <Send className="w-4 h-4 mr-2" />
                      {smsBusy ? 'Gönderiliyor…' : 'SMS Kodu Gönder'}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Yalnızca daha önce telefonunu doğrulamış koçlar SMS ile giriş yapabilir.
                    </p>
                  </form>
                ) : (
                  <form onSubmit={verifySmsCode} className="space-y-5">
                    <p className="text-sm text-foreground text-center">
                      <span className="font-mono">{normalizePhone(phone)}</span> numarasına gönderilen 6 haneli kodu girin.
                    </p>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={smsCode} onChange={(v) => setSmsCode(v.replace(/\D/g, ''))} autoFocus>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                          <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <Button type="submit" disabled={smsBusy || smsCode.length !== 6} className="w-full h-11 bg-primary text-black font-bold text-sm tracking-wide hover:shadow-glow-lime transition-shadow">
                      {smsBusy ? 'Doğrulanıyor…' : 'Doğrula ve Giriş Yap'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => { setSmsSent(false); setSmsCode(''); }} className="w-full">
                      Numarayı Değiştir
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {!showMfa && (
          <p className="text-center text-muted-foreground text-sm">
            Hesabınız yok mu?{' '}<Link to="/register" className="text-primary hover:underline font-medium">Kayıt Ol</Link>
          </p>
        )}
      </div>
    </div>
  );
}

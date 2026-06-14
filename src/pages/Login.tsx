import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Lock, Zap, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingLogin, setPendingLogin] = useState(false);
  const [showMfa, setShowMfa] = useState(false);
  const [factorId, setFactorId] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { signIn, signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setLoading(false);
      return;
    }

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
      const v = await supabase.auth.mfa.verify({
        factorId,
        challengeId: ch.data.id,
        code: mfaCode,
      });
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
              <p className="text-sm text-muted-foreground">
                Authenticator uygulamanızdaki 6 haneli kodu girin.
              </p>
            </div>

            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={mfaCode}
                onChange={(val) => setMfaCode(val.replace(/\D/g, ''))}
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              type="submit"
              disabled={isVerifying || mfaCode.length !== 6}
              className="w-full h-11 bg-primary text-black font-bold text-sm tracking-wide hover:shadow-glow-lime transition-shadow"
            >
              {isVerifying ? 'Doğrulanıyor...' : 'Doğrula ve Giriş Yap'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancelMfa}
              disabled={isVerifying}
              className="w-full"
            >
              İptal
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-7 shadow-2xl">
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

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { User, Mail, Lock, Zap, AtSign, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [role, setRole] = useState<'coach' | 'athlete'>('coach');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const inviteToken = searchParams.get('invite');

  useEffect(() => {
    if (inviteToken) {
      setRole('athlete');
    }
  }, [inviteToken]);

  // Debounced username uniqueness check
  const checkUsername = useCallback((value: string) => {
    if (!value || value.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', value)
        .maybeSingle();
      setUsernameStatus(data ? 'taken' : 'available');
    }, 500);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (role !== 'coach' || inviteToken) return;
    const cleanup = checkUsername(username);
    return cleanup;
  }, [username, role, inviteToken, checkUsername]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (val.length <= 20) setUsername(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Şifre en az 6 karakter olmalıdır.'); return; }

    const isCoachSignup = !inviteToken && role === 'coach';
    if (isCoachSignup) {
      if (username.length < 3) { toast.error('Kullanıcı adı en az 3 karakter olmalıdır.'); return; }
      if (usernameStatus !== 'available') { toast.error('Lütfen geçerli ve benzersiz bir kullanıcı adı seçin.'); return; }
    }

    setLoading(true);

    const finalRole = inviteToken ? 'athlete' : role;

    const { error } = await signUp(email, password, finalRole, fullName, inviteToken || undefined, isCoachSignup ? username : undefined);
    if (!error) {
      toast.success('Kayıt başarılı! E-postanızı kontrol edin veya giriş yapın.');
      navigate('/login');
    }
    setLoading(false);
  };

  const showUsernameField = role === 'coach' && !inviteToken;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08)_0%,transparent_70%)]" />
      <div className="w-full max-w-sm space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-8 h-8 text-primary drop-shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
            <h1 className="text-4xl font-extrabold tracking-tighter text-primary drop-shadow-[0_0_20px_hsl(var(--primary)/0.4)]">DYNABOLIC</h1>
          </div>
          <p className="text-muted-foreground text-sm tracking-widest uppercase">
            {inviteToken ? 'Koçunuzun Davetine Katılın' : 'Yeni Hesap Oluştur'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-7 shadow-2xl">
          {inviteToken && (
            <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-center">
              <p className="text-sm text-primary font-medium">🎉 Davet linki ile kayıt oluyorsunuz</p>
              <p className="text-xs text-muted-foreground mt-1">Otomatik olarak koçunuza bağlanacaksınız</p>
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ad Soyad</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input id="fullName" type="text" placeholder="Ahmet Yılmaz" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} className="flex h-11 w-full rounded-lg border border-white/10 bg-black/50 pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">E-posta</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input id="email" type="email" placeholder="sporcu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} className="flex h-11 w-full rounded-lg border border-white/10 bg-black/50 pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Şifre</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="flex h-11 w-full rounded-lg border border-white/10 bg-black/50 pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors" />
            </div>
          </div>
          {!inviteToken && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hesap Türü</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setRole('coach')} className={`h-10 rounded-lg border text-sm font-medium transition-colors ${role === 'coach' ? 'border-primary bg-primary/20 text-primary' : 'border-white/10 bg-black/50 text-muted-foreground hover:border-white/20'}`}>Koç</button>
                <button type="button" onClick={() => setRole('athlete')} className={`h-10 rounded-lg border text-sm font-medium transition-colors ${role === 'athlete' ? 'border-primary bg-primary/20 text-primary' : 'border-white/10 bg-black/50 text-muted-foreground hover:border-white/20'}`}>Sporcu</button>
              </div>
            </div>
          )}

          {/* Username field for coaches */}
          {showUsernameField && (
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kullanıcı Adı</label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="username"
                  type="text"
                  placeholder="fitahmet"
                  value={username}
                  onChange={handleUsernameChange}
                  required
                  minLength={3}
                  maxLength={20}
                  className="flex h-11 w-full rounded-lg border border-white/10 bg-black/50 pl-10 pr-10 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors"
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
              {username.length > 0 && username.length < 3 && (
                <p className="text-xs text-muted-foreground">En az 3 karakter gerekli</p>
              )}
              {usernameStatus === 'taken' && (
                <p className="text-xs text-destructive">Bu kullanıcı adı zaten alınmış</p>
              )}
              {usernameStatus === 'available' && (
                <p className="text-xs text-green-500">
                  E-posta adresiniz: <span className="font-medium">{username}@dynabolic.co</span>
                </p>
              )}
              {usernameStatus === 'idle' && username.length >= 3 && (
                <p className="text-xs text-muted-foreground">
                  Bu kullanıcı adı e-posta adresiniz olacak: {username}@dynabolic.co
                </p>
              )}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full h-11 bg-primary text-black font-bold text-sm tracking-wide hover:shadow-glow-lime transition-shadow">
            {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
          </Button>
        </form>
        <p className="text-center text-muted-foreground text-sm">
          Zaten hesabınız var mı?{' '}<Link to="/login" className="text-primary hover:underline font-medium">Giriş Yap</Link>
        </p>
      </div>
    </div>
  );
}

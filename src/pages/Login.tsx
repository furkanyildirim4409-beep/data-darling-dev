import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Mail, Lock, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingLogin, setPendingLogin] = useState(false);
  const { signIn, signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (!error) {
      setPendingLogin(true);
    }
    setLoading(false);
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
        <p className="text-center text-muted-foreground text-sm">
          Hesabınız yok mu?{' '}<Link to="/register" className="text-primary hover:underline font-medium">Kayıt Ol</Link>
        </p>
      </div>
    </div>
  );
}

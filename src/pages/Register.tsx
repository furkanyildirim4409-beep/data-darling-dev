import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { User, Mail, Lock, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'coach' | 'athlete'>('coach');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Şifre en az 6 karakter olmalıdır.'); return; }
    setLoading(true);
    const { error } = await signUp(email, password, role, fullName);
    if (!error) { toast.success('Kayıt başarılı! Giriş yapabilirsiniz.'); navigate('/login'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08)_0%,transparent_70%)]" />
      <div className="w-full max-w-sm space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-8 h-8 text-primary drop-shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
            <h1 className="text-4xl font-extrabold tracking-tighter text-primary drop-shadow-[0_0_20px_hsl(var(--primary)/0.4)]">DYNABOLIC</h1>
          </div>
          <p className="text-muted-foreground text-sm tracking-widest uppercase">Yeni Hesap Oluştur</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-7 shadow-2xl">
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
              <input id="email" type="email" placeholder="coach@dynabolic.com" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} className="flex h-11 w-full rounded-lg border border-white/10 bg-black/50 pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Şifre</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="flex h-11 w-full rounded-lg border border-white/10 bg-black/50 pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hesap Türü</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setRole('coach')} className={`h-10 rounded-lg border text-sm font-medium transition-colors ${role === 'coach' ? 'border-primary bg-primary/20 text-primary' : 'border-white/10 bg-black/50 text-muted-foreground hover:border-white/20'}`}>Koç</button>
              <button type="button" onClick={() => setRole('athlete')} className={`h-10 rounded-lg border text-sm font-medium transition-colors ${role === 'athlete' ? 'border-primary bg-primary/20 text-primary' : 'border-white/10 bg-black/50 text-muted-foreground hover:border-white/20'}`}>Sporcu</button>
            </div>
          </div>
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

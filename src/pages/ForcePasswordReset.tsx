import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function ForcePasswordReset() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password,
      data: { needs_password_reset: false },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Şifreniz başarıyla güncellendi!');
    navigate('/', { replace: true });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Şifre Değiştirme</CardTitle>
          <CardDescription>
            Güvenliğiniz için geçici şifrenizi değiştirmeniz gerekmektedir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Yeni Şifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 6 karakter"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Şifrenizi tekrar girin"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

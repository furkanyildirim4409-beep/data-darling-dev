import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, role } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) { return <Navigate to="/login" replace />; }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!role || !allowedRoles.includes(role)) {
      return (
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-destructive">Yetkisiz Erişim</h1>
            <p className="text-muted-foreground">Bu panele erişim yetkiniz bulunmamaktadır.</p>
            <button onClick={() => window.location.href = '/login'} className="text-primary underline text-sm">Giriş sayfasına dön</button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

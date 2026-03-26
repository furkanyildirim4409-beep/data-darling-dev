import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { SearchProvider } from "@/contexts/SearchContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { usePermissions, type Permissions } from "@/hooks/usePermissions";
import CommandCenter from "./pages/CommandCenter";
import Athletes from "./pages/Athletes";
import AthleteDetail from "./pages/AthleteDetail";
import Programs from "./pages/Programs";
import Alerts from "./pages/Alerts";
import Business from "./pages/Business";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import StoreManager from "./pages/StoreManager";
import ContentStudio from "./pages/ContentStudio";
import Performance from "./pages/Performance";
import Messages from "./pages/Messages";
import Disputes from "./pages/Disputes";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForcePasswordReset from "./pages/ForcePasswordReset";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function PermissionRoute({ children, permissionKey }: { children: React.ReactNode; permissionKey: keyof Permissions }) {
  const permissions = usePermissions();
  if (!permissions[permissionKey]) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <SearchProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/force-password-reset" element={
                <ProtectedRoute>
                  <ForcePasswordReset />
                </ProtectedRoute>
              } />
              <Route
                element={
                  <ProtectedRoute allowedRoles={['coach']}>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<CommandCenter />} />
                <Route path="/athletes" element={<Athletes />} />
                <Route path="/athletes/:id" element={<AthleteDetail />} />
                <Route path="/programs" element={<Programs />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/business" element={<PermissionRoute permissionKey="canViewFinances"><Business /></PermissionRoute>} />
                <Route path="/store" element={<PermissionRoute permissionKey="canViewStore"><StoreManager /></PermissionRoute>} />
                <Route path="/content" element={<PermissionRoute permissionKey="canViewContent"><ContentStudio /></PermissionRoute>} />
                <Route path="/team" element={<PermissionRoute permissionKey="canViewTeam"><Team /></PermissionRoute>} />
                <Route path="/settings" element={<PermissionRoute permissionKey="canViewTeam"><Settings /></PermissionRoute>} />
                <Route path="/performance" element={<Performance />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/disputes" element={<Disputes />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </SearchProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
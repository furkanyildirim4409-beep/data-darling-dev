import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { SearchProvider } from "@/contexts/SearchContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
                <Route path="/business" element={<Business />} />
                <Route path="/store" element={<StoreManager />} />
                <Route path="/content" element={<ContentStudio />} />
                <Route path="/team" element={<Team />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/performance" element={<Performance />} />
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
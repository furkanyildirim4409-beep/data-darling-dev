import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { PushPermissionBanner } from "./PushPermissionBanner";
import { MaintenanceBanner } from "./MaintenanceBanner";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useForegroundPush } from "@/hooks/useForegroundPush";
import { useAuth } from "@/contexts/AuthContext";
import { CoachChatProvider } from "@/hooks/useCoachChat";
import { TeamChatProvider } from "@/hooks/useTeamChat";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const isFullBleed = pathname.startsWith("/messages");
  const { profile, signOut } = useAuth();

  // Auto-sync push subscription on boot (runs silently via internal useEffect)
  usePushNotifications();
  useForegroundPush();

  // Full-screen kill switch: intercepts every route before anything else renders.
  if (profile && profile.is_active === false) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0f] text-foreground">
        <div className="relative flex flex-col items-center gap-6 max-w-md px-8 text-center">
          <div className="absolute inset-0 -z-10 bg-destructive/20 blur-3xl rounded-full" />
          <div className="w-24 h-24 rounded-full border-2 border-destructive/70 bg-destructive/10 flex items-center justify-center shadow-[0_0_80px_hsl(var(--destructive)/0.6)]">
            <Lock className="w-12 h-12 text-destructive animate-pulse" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Hesap Devre Dışı</h1>
          <p className="text-muted-foreground leading-relaxed">
            Kullanıcınız aktif değil. Lütfen ana koçunuz ile görüşün.
          </p>
          <Button variant="destructive" onClick={signOut} className="mt-2 px-8">
            Çıkış Yap
          </Button>
        </div>
      </div>
    );
  }

  return (
    <CoachChatProvider>
      <TeamChatProvider>
        <div className="flex flex-col w-full h-screen overflow-hidden bg-background">
          <MaintenanceBanner />
          <div className="flex flex-1 w-full overflow-hidden">
          {!isMobile && (
            <AppSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
          )}
          <div className="flex-1 flex flex-col h-screen overflow-hidden">
            <TopBar />
            <PushPermissionBanner />
            <main className={cn(
              "flex-1 grid-pattern scrollbar-thin mobile-scroll min-h-0",
              isFullBleed ? "overflow-hidden" : "overflow-auto"
            )}>
              {isFullBleed ? <Outlet /> : <div className="p-4 md:p-6"><Outlet /></div>}
            </main>
          </div>
          </div>
        </div>
      </TeamChatProvider>
    </CoachChatProvider>
  );
}

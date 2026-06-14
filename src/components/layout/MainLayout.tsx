import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { PushPermissionBanner } from "./PushPermissionBanner";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useForegroundPush } from "@/hooks/useForegroundPush";
import { cn } from "@/lib/utils";

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const isFullBleed = pathname.startsWith("/messages");

  // Auto-sync push subscription on boot (runs silently via internal useEffect)
  usePushNotifications();
  useForegroundPush();

  return (
    <div className="flex w-full h-screen overflow-hidden bg-background">
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
  );
}

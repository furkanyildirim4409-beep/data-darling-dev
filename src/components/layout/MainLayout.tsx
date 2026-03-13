import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { PushPermissionBanner } from "./PushPermissionBanner";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();

  // Auto-sync push subscription on boot (runs silently via internal useEffect)
  usePushNotifications();

  return (
    <div className="flex w-full h-screen overflow-hidden bg-background">
      {!isMobile && (
        <AppSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      )}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopBar />
        <PushPermissionBanner />
        <main className="flex-1 overflow-auto grid-pattern scrollbar-thin mobile-scroll">
          <div className="p-4 md:p-6"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}

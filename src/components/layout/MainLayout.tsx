import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToPush } from "@/hooks/usePushNotifications";

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Register push subscription when authenticated
  useEffect(() => {
    if (user?.id) {
      subscribeToPush(user.id).catch(() => {});
    }
  }, [user?.id]);

  return (
    <div className="flex w-full h-screen overflow-hidden bg-background">
      {!isMobile && (
        <AppSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      )}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto grid-pattern scrollbar-thin mobile-scroll">
          <div className="p-4 md:p-6"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}

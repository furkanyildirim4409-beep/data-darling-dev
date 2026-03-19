import { useMemo } from "react";
import { useCoachChat } from "@/hooks/useCoachChat";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Target,
  Users,
  ClipboardList,
  Zap,
  Briefcase,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Palette,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { allAlerts, getHealthAlerts, getPaymentAlerts } from "@/data/alerts";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { path: "/", label: "Kokpit", icon: Target },
  { path: "/athletes", label: "Sporcular", icon: Users },
  { path: "/programs", label: "Program Mimarı", icon: ClipboardList },
  { path: "/alerts", label: "Hızlı Müdahale", icon: Zap, showBadge: true },
  { path: "/business", label: "İş Yönetimi", icon: Briefcase, adminOnly: true },
  { path: "/store", label: "Mağaza", icon: ShoppingBag, adminOnly: true },
  { path: "/content", label: "İçerik Stüdyosu", icon: Palette, adminOnly: true },
  { path: "/messages", label: "Mesajlar", icon: MessageCircle, showMessageBadge: true },
  { path: "/team", label: "Takım", icon: UserCog, adminOnly: true },
  { path: "/settings", label: "Ayarlar", icon: Settings, adminOnly: true },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const { totalUnread } = useCoachChat();

  // Calculate alert counts
  const alertCounts = useMemo(() => {
    const critical = allAlerts.filter(a => a.level === "critical").length;
    const warning = allAlerts.filter(a => a.level === "warning").length;
    return { critical, warning, total: critical + warning };
  }, []);

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">D</span>
            </div>
            <span className="font-semibold text-foreground tracking-tight">DYNABOLIC</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-sm">D</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== "/" && location.pathname.startsWith(item.path));
          const Icon = item.icon;
          const showBadge = item.showBadge && alertCounts.total > 0;
          const showMsgBadge = (item as any).showMessageBadge && totalUnread > 0;
          const badgeActive = showBadge || showMsgBadge;
          const badgeCount = showBadge ? alertCounts.total : totalUnread;
          const badgeIsCritical = showBadge && alertCounts.critical > 0;

          const linkContent = (
            <NavLink
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20 glow-lime"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-transparent"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {/* Badge for collapsed state */}
                {badgeActive && collapsed && (
                  <AnimatePresence>
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className={cn(
                        "absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                        badgeIsCritical
                          ? "bg-destructive text-destructive-foreground pulse-red" 
                          : showMsgBadge
                            ? "bg-primary text-primary-foreground"
                            : "bg-warning text-warning-foreground"
                      )}
                    >
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </motion.span>
                  </AnimatePresence>
                )}
              </div>
              {!collapsed && (
                <>
                  <span className={cn("font-medium text-sm flex-1", isActive && "text-glow-lime")}>
                    {item.label}
                  </span>
                  {/* Badge for expanded state */}
                  {badgeActive && (
                    <AnimatePresence>
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className={cn(
                          "min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center",
                          badgeIsCritical
                            ? "bg-destructive text-destructive-foreground pulse-red" 
                            : showMsgBadge
                              ? "bg-primary text-primary-foreground"
                              : "bg-warning text-warning-foreground"
                        )}
                      >
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </motion.span>
                    </AnimatePresence>
                  )}
                </>
              )}
            </NavLink>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="bg-card border-border">
                  <div className="flex items-center gap-2">
                    {item.label}
                    {badgeActive && (
                      <span className={cn(
                        "min-w-[18px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                        badgeIsCritical
                          ? "bg-destructive text-destructive-foreground" 
                          : showMsgBadge
                            ? "bg-primary text-primary-foreground"
                            : "bg-warning text-warning-foreground"
                      )}>
                        {badgeCount}
                      </span>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.path}>{linkContent}</div>;
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-full justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span className="text-xs">Daralt</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

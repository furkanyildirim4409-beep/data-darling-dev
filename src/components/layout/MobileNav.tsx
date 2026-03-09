import { useState, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Target,
  Users,
  ClipboardList,
  CalendarDays,
  Zap,
  Briefcase,
  UserCog,
  Settings,
  ShoppingBag,
  Palette,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { allAlerts } from "@/data/alerts";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { path: "/", label: "Kokpit", icon: Target },
  { path: "/athletes", label: "Sporcular", icon: Users },
  { path: "/programs", label: "Program Mimarı", icon: ClipboardList },
  { path: "/schedule", label: "Takvim", icon: CalendarDays },
  { path: "/alerts", label: "Hızlı Müdahale", icon: Zap, showBadge: true },
  { path: "/business", label: "İş Yönetimi", icon: Briefcase },
  { path: "/store", label: "Mağaza", icon: ShoppingBag },
  { path: "/content", label: "İçerik Stüdyosu", icon: Palette },
  { path: "/team", label: "Takım", icon: UserCog },
  { path: "/settings", label: "Ayarlar", icon: Settings },
];

interface MobileNavProps {
  className?: string;
}

export function MobileNav({ className }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Calculate alert counts
  const alertCounts = useMemo(() => {
    const critical = allAlerts.filter((a) => a.level === "critical").length;
    const warning = allAlerts.filter((a) => a.level === "warning").length;
    return { critical, warning, total: critical + warning };
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("md:hidden", className)}
        >
          <Menu className="w-5 h-5" />
          <span className="sr-only">Menüyü aç</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-sidebar border-sidebar-border p-0">
        <SheetHeader className="h-16 flex flex-row items-center justify-between px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">D</span>
            </div>
            <SheetTitle className="font-semibold text-foreground tracking-tight">
              DYNABOLIC
            </SheetTitle>
          </div>
        </SheetHeader>

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            const showBadge = item.showBadge && alertCounts.total > 0;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative touch-target",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20 glow-lime"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-transparent"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0 transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span
                  className={cn(
                    "font-medium text-sm flex-1",
                    isActive && "text-glow-lime"
                  )}
                >
                  {item.label}
                </span>
                {showBadge && (
                  <AnimatePresence>
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className={cn(
                        "min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center",
                        alertCounts.critical > 0
                          ? "bg-destructive text-destructive-foreground pulse-red"
                          : "bg-warning text-warning-foreground"
                      )}
                    >
                      {alertCounts.total > 99 ? "99+" : alertCounts.total}
                    </motion.span>
                  </AnimatePresence>
                )}
              </NavLink>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

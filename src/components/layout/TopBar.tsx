import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronDown, LogOut, User, Settings, Clock, CreditCard, UserCheck, AlertCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { GlobalSearch } from "./GlobalSearch";
import { MobileNav } from "./MobileNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Mock notifications data
const mockNotifications = [
  {
    id: 1,
    message: "Ahmet programı tamamladı",
    time: "2 dk önce",
    icon: UserCheck,
    type: "success",
    read: false,
  },
  {
    id: 2,
    message: "Yeni ödeme alındı: ₺1,500",
    time: "15 dk önce",
    icon: CreditCard,
    type: "success",
    read: false,
  },
  {
    id: 3,
    message: "Selin check-in geciktirdi",
    time: "32 dk önce",
    icon: Clock,
    type: "warning",
    read: false,
  },
  {
    id: 4,
    message: "Mert'in risk skoru kritik seviyede",
    time: "1 saat önce",
    icon: AlertCircle,
    type: "danger",
    read: false,
  },
  {
    id: 5,
    message: "3 yeni sporcu kaydı tamamlandı",
    time: "2 saat önce",
    icon: UserCheck,
    type: "info",
    read: true,
  },
];

function getNotificationStyles(type: string) {
  switch (type) {
    case "success":
      return "text-success bg-success/10";
    case "warning":
      return "text-warning bg-warning/10";
    case "danger":
      return "text-destructive bg-destructive/10";
    default:
      return "text-primary bg-primary/10";
  }
}

export function TopBar() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState(mockNotifications);
  const [isOpen, setIsOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Mark all as read when opening
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  return (
    <header className="h-14 md:h-16 glass border-b border-border flex items-center justify-between px-3 md:px-6">
      {/* Left Section - Mobile Nav + Logo or Search */}
      <div className="flex items-center gap-2 md:gap-4 flex-1">
        {/* Mobile Navigation */}
        <MobileNav />

        {/* Mobile Logo (visible on mobile when search is closed) */}
        {isMobile && !mobileSearchOpen && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">D</span>
            </div>
            <span className="font-semibold text-foreground text-sm tracking-tight">DYNABOLIC</span>
          </div>
        )}

        {/* Mobile Search Toggle */}
        {isMobile && !mobileSearchOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileSearchOpen(true)}
            className="ml-auto"
          >
            <Search className="w-5 h-5 text-muted-foreground" />
          </Button>
        )}

        {/* Mobile Search Expanded */}
        {isMobile && mobileSearchOpen && (
          <div className="flex-1 flex items-center gap-2">
            <GlobalSearch />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileSearchOpen(false)}
              className="text-muted-foreground"
            >
              İptal
            </Button>
          </div>
        )}

        {/* Desktop Search */}
        {!isMobile && <GlobalSearch />}
      </div>

      {/* Right Section - Hidden when mobile search is open */}
      {!(isMobile && mobileSearchOpen) && (
        <div className="flex items-center gap-2 md:gap-4">
        {/* Notifications */}
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative hover:bg-secondary">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive rounded-full flex items-center justify-center text-[10px] font-bold text-white pulse-red">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            align="end" 
            className="w-80 p-0 bg-card border-border shadow-xl"
          >
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Bildirimler</h3>
                {notifications.some(n => !n.read) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-primary hover:text-primary/80"
                    onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                  >
                    Tümünü okundu işaretle
                  </Button>
                )}
              </div>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((notification) => {
                const Icon = notification.icon;
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 p-4 border-b border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors",
                      !notification.read && "bg-primary/5"
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      getNotificationStyles(notification.type)
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm text-foreground",
                        !notification.read && "font-medium"
                      )}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {notification.time}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t border-border">
              <Button 
                variant="ghost" 
                className="w-full text-sm text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/alerts");
                }}
              >
                Tüm bildirimleri görüntüle
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-3 hover:bg-secondary px-2"
            >
              <Avatar className="w-8 h-8 border border-border">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  JD
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium text-foreground">Koç Davis</span>
                <span className="text-xs text-muted-foreground">Baş Antrenör</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 glass border-border">
            <DropdownMenuItem 
              className="cursor-pointer hover:bg-secondary"
              onClick={() => navigate("/content")}
            >
              <User className="w-4 h-4 mr-2" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer hover:bg-secondary"
              onClick={() => navigate("/settings")}
            >
              <Settings className="w-4 h-4 mr-2" />
              Ayarlar
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="cursor-pointer hover:bg-secondary text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      )}
    </header>
  );
}

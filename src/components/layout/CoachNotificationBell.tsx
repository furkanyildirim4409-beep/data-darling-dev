import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ShoppingBag, AlertTriangle, MessageSquare, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCoachNotifications, type CoachNotificationType } from "@/hooks/useCoachNotifications";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Şimdi";
  if (mins < 60) return `${mins}dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa önce`;
  const days = Math.floor(hours / 24);
  return `${days}g önce`;
}

const TYPE_META: Record<
  CoachNotificationType,
  { Icon: typeof Bell; cls: string }
> = {
  order: { Icon: ShoppingBag, cls: "text-emerald-500 bg-emerald-500/10" },
  compliance_alert: { Icon: AlertTriangle, cls: "text-destructive bg-destructive/10" },
  message: { Icon: MessageSquare, cls: "text-primary bg-primary/10" },
  system: { Icon: Info, cls: "text-muted-foreground bg-muted" },
};

export function CoachNotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useCoachNotifications();

  const handleClick = (id: string, action_url: string | null, isRead: boolean) => {
    if (!isRead) markAsRead(id);
    if (action_url) {
      setOpen(false);
      navigate(action_url);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-secondary" aria-label="Bildirimler">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 bg-destructive rounded-full flex items-center justify-center text-[10px] font-bold text-white pulse-red">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0 bg-card border-border shadow-xl">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Bildirimler</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {unreadCount > 0 ? `${unreadCount} okunmamış` : "Hepsi okundu"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary hover:text-primary/80"
              onClick={() => markAllAsRead()}
            >
              Tümünü okundu işaretle
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto scrollbar-hide">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Henüz bildirim yok</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Sipariş, mesaj ve uyumluluk uyarıları burada görünecek
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.system;
              const { Icon } = meta;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n.id, n.action_url, n.is_read)}
                  className={cn(
                    "w-full text-left flex items-start gap-3 p-4 border-b border-border/50 hover:bg-secondary/50 transition-colors",
                    !n.is_read && "bg-primary/5",
                  )}
                >
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", meta.cls)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm text-foreground truncate", !n.is_read && "font-semibold")}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

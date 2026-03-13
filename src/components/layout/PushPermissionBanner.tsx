import { useEffect, useState } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Button } from "@/components/ui/button";
import { BellRing, X } from "lucide-react";

export function PushPermissionBanner() {
  const { isSupported, isSubscribed, subscribe } = usePushNotifications();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if ("Notification" in window && isSupported && !isSubscribed) {
      if (Notification.permission === "default") {
        const timer = setTimeout(() => setIsVisible(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [isSupported, isSubscribed]);

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success || Notification.permission === "denied") {
      setIsVisible(false);
    }
  };

  if (!isVisible || isSubscribed) return null;

  return (
    <div className="mx-4 mt-2 rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <BellRing className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Bildirimleri Etkinleştir</p>
          <p className="text-xs text-muted-foreground">Öğrencilerinden gelen mesajları ve uyarıları anında al.</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" onClick={handleSubscribe}>
          İzin Ver
        </Button>
        <button onClick={() => setIsVisible(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

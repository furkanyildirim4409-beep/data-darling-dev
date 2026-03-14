import { cn } from "@/lib/utils";
import {
  Trophy,
  MessageSquare,
  Activity,
  TrendingUp,
  Calendar,
  Zap,
  ClipboardCheck,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useActionStream, type ActionItem } from "@/hooks/useActionStream";

const actionIcons: Record<ActionItem["type"], { icon: any; color: string; bg: string }> = {
  pr: { icon: Trophy, color: "text-primary", bg: "bg-primary/20" },
  checkin: { icon: MessageSquare, color: "text-success", bg: "bg-success/20" },
  session: { icon: Activity, color: "text-cyan-400", bg: "bg-cyan-400/20" },
  milestone: { icon: TrendingUp, color: "text-primary", bg: "bg-primary/20" },
  alert: { icon: Zap, color: "text-warning", bg: "bg-warning/20" },
  assignment: { icon: ClipboardCheck, color: "text-accent-foreground", bg: "bg-accent/30" },
};

export function ActionStream() {
  const { actions, isLoading } = useActionStream();

  return (
    <div className="glass rounded-xl border border-border h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <h3 className="font-semibold text-foreground">Aksiyon Akışı</h3>
        </div>
        <span className="text-xs font-mono text-muted-foreground">CANLI</span>
      </div>

      {/* Scrolling Actions */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none" />

        <div className="h-full overflow-y-auto scrollbar-thin px-4 py-2 space-y-2">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : actions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Activity className="w-8 h-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Henüz aktivite yok</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Sporcularınız antrenman ve check-in yaptıkça burada görünecek</p>
            </div>
          ) : (
            actions.map((action) => {
              const config = actionIcons[action.type];
              const Icon = config.icon;

              return (
                <div
                  key={action.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg transition-all duration-500 cursor-pointer hover:bg-secondary/50",
                    action.isNew && "animate-fade-in bg-primary/5 border border-primary/20"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      config.bg
                    )}
                  >
                    <Icon className={cn("w-4 h-4", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">{action.message}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {action.timestamp}
                    </p>
                  </div>
                  {action.isNew && (
                    <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      YENİ
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent pointer-events-none" />
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-border flex-shrink-0">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-primary" />
              <span className="font-mono text-foreground">
                {actions.filter((a) => a.type === "pr").length}
              </span>
              <span className="text-muted-foreground">PR</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-success" />
              <span className="font-mono text-foreground">
                {actions.filter((a) => a.type === "session").length}
              </span>
              <span className="text-muted-foreground">seans</span>
            </div>
          </div>
          <span className="text-muted-foreground">30sn'de yenilenir</span>
        </div>
      </div>
    </div>
  );
}

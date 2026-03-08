import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Camera,
  CreditCard,
  MessageSquare,
  Activity,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Calendar,
  Zap,
} from "lucide-react";

interface ActionItem {
  id: number;
  type: "pr" | "photo" | "payment" | "checkin" | "alert" | "session" | "milestone";
  message: string;
  timestamp: string;
  isNew?: boolean;
}

const actionIcons = {
  pr: { icon: Trophy, color: "text-primary", bg: "bg-primary/20" },
  photo: { icon: Camera, color: "text-blue-400", bg: "bg-blue-400/20" },
  payment: { icon: CreditCard, color: "text-destructive", bg: "bg-destructive/20" },
  checkin: { icon: MessageSquare, color: "text-success", bg: "bg-success/20" },
  alert: { icon: AlertCircle, color: "text-warning", bg: "bg-warning/20" },
  session: { icon: Activity, color: "text-cyan-400", bg: "bg-cyan-400/20" },
  milestone: { icon: TrendingUp, color: "text-primary", bg: "bg-primary/20" },
};

const initialActions: ActionItem[] = [
  { id: 1, type: "pr", message: "Ahmet Y. PR kırdı → 140kg Bench Press", timestamp: "Şimdi" },
  { id: 2, type: "photo", message: "Selin A. vücut güncellemesi yükledi", timestamp: "2dk önce" },
  { id: 3, type: "payment", message: "⚠️ Ödeme Başarısız → Mert K.", timestamp: "5dk önce" },
  { id: 4, type: "checkin", message: "Elena R. günlük check-in tamamladı", timestamp: "8dk önce" },
  { id: 5, type: "session", message: "Marcus T. Hafta 5 Gün 1'i başlattı", timestamp: "12dk önce" },
  { id: 6, type: "alert", message: "Jake W. 2 ardışık seans kaçırdı", timestamp: "18dk önce" },
  { id: 7, type: "pr", message: "Jessica M. PR kırdı → 180kg Deadlift", timestamp: "25dk önce" },
  { id: 8, type: "milestone", message: "David K. 12 haftalık seriye ulaştı", timestamp: "32dk önce" },
  { id: 9, type: "checkin", message: "Amanda P. beslenme günlüğü gönderdi", timestamp: "45dk önce" },
  { id: 10, type: "photo", message: "Can B. ilerleme fotoğrafı yükledi", timestamp: "1sa önce" },
  { id: 11, type: "session", message: "Deniz E. kardiyo seansını tamamladı", timestamp: "1sa önce" },
  { id: 12, type: "payment", message: "✓ Ödeme alındı → Ayşe D.", timestamp: "1.5sa önce" },
  { id: 13, type: "pr", message: "Gökhan H. PR kırdı → 100kg OHP", timestamp: "2sa önce" },
  { id: 14, type: "alert", message: "Sistem: HRV anomalisi tespit edildi → 3 sporcu", timestamp: "2sa önce" },
  { id: 15, type: "milestone", message: "Takım haftalık %90 uyuma ulaştı", timestamp: "3sa önce" },
];

const newActionTemplates = [
  { type: "pr" as const, message: "Yeni PR kaydedildi → Squat" },
  { type: "checkin" as const, message: "Günlük check-in tamamlandı" },
  { type: "session" as const, message: "Antrenman seansı başlatıldı" },
  { type: "photo" as const, message: "İlerleme fotoğrafı yüklendi" },
];

const names = ["Fatma G.", "Hakan I.", "Ipek J.", "Kemal L.", "Leyla M.", "Mustafa N."];

export function ActionStream() {
  const [actions, setActions] = useState<ActionItem[]>(initialActions);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      const template = newActionTemplates[Math.floor(Math.random() * newActionTemplates.length)];
      const name = names[Math.floor(Math.random() * names.length)];

      const newAction: ActionItem = {
        id: Date.now(),
        type: template.type,
        message: `${name} → ${template.message}`,
        timestamp: "Şimdi",
        isNew: true,
      };

      setActions((prev) => [newAction, ...prev.slice(0, 14)]);

      // Remove "new" flag after animation
      setTimeout(() => {
        setActions((prev) =>
          prev.map((a) => (a.id === newAction.id ? { ...a, isNew: false } : a))
        );
      }, 2000);
    }, 8000); // New action every 8 seconds

    return () => clearInterval(interval);
  }, []);

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
        {/* Top fade */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none" />

        <div className="h-full overflow-y-auto scrollbar-thin px-4 py-2 space-y-2">
          {actions.map((action) => {
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
          })}
        </div>

        {/* Bottom fade */}
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
              <span className="text-muted-foreground">PR bugün</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-success" />
              <span className="font-mono text-foreground">
                {actions.filter((a) => a.type === "session").length}
              </span>
              <span className="text-muted-foreground">seans</span>
            </div>
          </div>
          <span className="text-muted-foreground">↓ Daha fazlası için kaydır</span>
        </div>
      </div>
    </div>
  );
}
